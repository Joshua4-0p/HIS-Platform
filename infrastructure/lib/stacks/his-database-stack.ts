import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { HisVpcStack } from './his-vpc-stack';

export interface HisDatabaseStackProps extends cdk.StackProps {
  vpcStack: HisVpcStack;
}

// Phase 2: RDS PostgreSQL 15 + Secrets Manager master credentials
// Phase 3: Flyway-style V1-V14 migrations via CloudFormation Custom Resource
// SRS: REQ-NF-007 (AES-256 at rest), REQ-NF-009 (no credentials in code),
//       REQ-NF-013 (private subnet, no public IP), REQ-NF-017 (2-day backup MVP),
//       REQ-NF-018 (single-AZ MVP), REQ-NF-026 (versioned migrations via Phase 3)
export class HisDatabaseStack extends cdk.Stack {
  public readonly rdsInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: HisDatabaseStackProps) {
    super(scope, id, props);

    // Parameter Group: pg_cron for materialized view refresh (REQ-F-003) and
    // daily summary emails at 08:00 WAT (REQ-F-067). cron.database_name must
    // match the database name used at instance creation time.
    const paramGroup = new rds.ParameterGroup(this, 'HisDbParamGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      parameters: {
        shared_preload_libraries: 'pg_cron',
        'cron.database_name': 'hisdb',
      },
    });

    // RDS Instance: PostgreSQL 15, db.t3.micro, single-AZ (REQ-NF-018 MVP decision)
    // - storageEncrypted: true uses aws/rds AWS managed key (AES-256, REQ-NF-007)
    // - iamAuthentication: true enables Lambda IAM DB auth via his_app role (REQ-NF-009)
    // - Master credentials via fromGeneratedSecret stored in Secrets Manager only;
    //   used for migrations only. Lambda runtime connections use IAM DB auth token.
    // - backupRetention 2 days MVP; CDK parameter to update to 30 days for production
    // - removalPolicy DESTROY for MVP; must be changed to RETAIN before production
    this.rdsInstance = new rds.DatabaseInstance(this, 'HisRdsInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpcStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.rdsSg],
      parameterGroup: paramGroup,
      databaseName: 'hisdb',
      credentials: rds.Credentials.fromGeneratedSecret('hisadmin', {
        secretName: 'his/rds/master-credentials',
      }),
      storageEncrypted: true,
      allocatedStorage: 20,
      backupRetention: cdk.Duration.days(2),
      deletionProtection: false,
      multiAz: false,
      publiclyAccessible: false,
      iamAuthentication: true,
      cloudwatchLogsExports: ['postgresql'],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // Phase 3: Database Migration Custom Resource (V1-V14)
    // =========================================================================
    //
    // Architecture: CDK Provider pattern (aws-cdk-lib/custom-resources.Provider)
    //
    // Two-Lambda design:
    //   migrationFn   - INSIDE VPC (reaches RDS on port 5432). Runs all 14
    //                   migrations. Credentials injected by CloudFormation as
    //                   {{resolve:secretsmanager:...}} dynamic references;
    //                   the Lambda reads plain env vars (no runtime SM call).
    //   Framework Fn  - OUTSIDE VPC (CDK Provider creates this automatically).
    //                   Handles the CloudFormation S3 presigned-URL response.
    //                   Invokes migrationFn via Lambda API (not VPC networking).
    //
    // Secrets safety (REQ-NF-009): only the Secret ARN (non-sensitive) is in env vars.
    //   The handler calls secretsmanager:GetSecretValue at invocation time.
    //   Runtime access requires a Secrets Manager VPC Interface Endpoint (Phase 11).
    // =========================================================================

    // IAM role: VPC Lambda execution (EC2 ENI + CloudWatch Logs) +
    // GetSecretValue on the RDS master secret so the handler fetches credentials
    // at runtime without storing them in env vars (REQ-NF-009).
    const migrationRole = new iam.Role(this, 'MigrationRunnerRole', {
      roleName: 'his-migration-runner-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaVPCAccessExecutionRole',
        ),
      ],
      description: 'HIS migration runner - VPC access to RDS, runtime Secrets Manager fetch',
    });

    // Allow runtime credential fetch from Secrets Manager.
    // Requires a Secrets Manager VPC Interface Endpoint in the VPC to function --
    // the endpoint is added in Phase 11 when new migrations (V15+) are needed.
    migrationRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [this.rdsInstance.secret!.secretArn],
    }));

    // Migration runner Lambda: in VPC private isolated subnet, reaches RDS on 5432
    // Bundled with esbuild; pg installed as a real node_module to avoid native binding issues
    const migrationFn = new nodejs.NodejsFunction(this, 'MigrationRunnerFn', {
      functionName: 'his-migration-runner',
      entry: path.join(__dirname, '../../src/handlers/migration-runner.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      role: migrationRole,
      vpc: props.vpcStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      // reservedConcurrentExecutions intentionally omitted: account concurrency limit
      // is 10 (sandbox). REQ-NF-021 is satisfied by the account ceiling. Re-enable
      // for production after requesting a concurrency quota increase to >= 1000.
      environment: {
        DB_HOST: this.rdsInstance.dbInstanceEndpointAddress,
        DB_PORT: this.rdsInstance.dbInstanceEndpointPort,
        DB_NAME: 'hisdb',
        // Secret ARN (not the secret value) -- handler calls GetSecretValue at runtime.
        // DB_USER and DB_PASSWORD are intentionally absent (REQ-NF-009).
        DB_SECRET_ARN: this.rdsInstance.secret!.secretArn,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
        // pg installed via npm (not esbuild-bundled) to avoid pg-native issues
        nodeModules: ['pg'],
      },
    });

    // Provider: framework Lambda runs OUTSIDE the VPC to handle CF S3 response URL.
    // Framework Lambda is auto-granted permission to invoke migrationFn.
    const migrationProvider = new Provider(this, 'MigrationProvider', {
      onEventHandler: migrationFn,
    });

    // Custom Resource: SchemaVersion triggers re-execution when incremented.
    // Bump SchemaVersion to the highest new migration version to re-run on deploy.
    new cdk.CustomResource(this, 'DatabaseMigrations', {
      serviceToken: migrationProvider.serviceToken,
      resourceType: 'Custom::HisDatabaseMigrations',
      properties: {
        SchemaVersion: 'V16',
      },
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'RdsEndpointAddress', {
      value: this.rdsInstance.dbInstanceEndpointAddress,
      exportName: 'HisRdsEndpointAddress',
      description: 'HIS RDS PostgreSQL endpoint address',
    });

    new cdk.CfnOutput(this, 'RdsEndpointPort', {
      value: this.rdsInstance.dbInstanceEndpointPort,
      exportName: 'HisRdsEndpointPort',
      description: 'HIS RDS PostgreSQL endpoint port',
    });

    new cdk.CfnOutput(this, 'RdsSecretArn', {
      value: this.rdsInstance.secret!.secretArn,
      exportName: 'HisRdsSecretArn',
      description: 'ARN of the Secrets Manager secret holding RDS master credentials (migrations only)',
    });

    new cdk.CfnOutput(this, 'RdsDatabaseName', {
      value: 'hisdb',
      exportName: 'HisRdsDatabaseName',
      description: 'HIS RDS PostgreSQL database name',
    });
  }
}
