import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

// Phase 4: Cognito User Pool + User Pool Client + Super Admin seed
// SRS: REQ-F-001-005 (auth, email verify, password policy),
//      REQ-NF-009 (credentials in Cognito only), REQ-NF-012 (Cognito handles hashing),
//      COM-003 (JWT RS256, 60-min token, silent refresh via 30-day refresh token)
export class HisAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =========================================================================
    // 1. Cognito User Pool
    // =========================================================================
    // selfSignUpEnabled=false: only admins create users (REQ-F-001)
    // email alias: email is the login credential
    // passwordPolicy: 10 chars, upper, digit, symbol (REQ-F-005)
    // mfa=OFF: deferred to production per MVP scope
    // removalPolicy=DESTROY: safe to recreate in dev/MVP

    this.userPool = new cognito.UserPool(this, 'HisUserPool', {
      userPoolName: 'HisUserPool',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OFF,
      customAttributes: {
        hospital_id:    new cognito.StringAttribute({ mutable: true }),
        role_id:        new cognito.StringAttribute({ mutable: true }),
        role_name:      new cognito.StringAttribute({ mutable: true }),
        user_db_id:     new cognito.StringAttribute({ mutable: true }),
        is_super_admin: new cognito.StringAttribute({ mutable: true }),
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // 2. User Pool Client (SPA web client)
    // =========================================================================
    // generateSecret=false: SPA cannot securely store a client secret
    // userPassword+userSrp: USER_PASSWORD_AUTH for temp-password first login,
    //   USER_SRP_AUTH for subsequent logins (secure remote password)
    // refreshToken=30 days: enables silent renewal without re-login (COM-003)
    // readAttributes=all custom: frontend reads hospital_id, role, etc. from ID token
    // writeAttributes=none: Lambdas set custom attrs via admin API only (REQ-NF-009)

    this.userPoolClient = new cognito.UserPoolClient(this, 'HisWebClient', {
      userPool: this.userPool,
      userPoolClientName: 'HisWebClient',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity:  cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      idTokenValidity:      cdk.Duration.minutes(60),
      generateSecret: false,
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, emailVerified: true })
        .withCustomAttributes(
          'hospital_id',
          'role_id',
          'role_name',
          'user_db_id',
          'is_super_admin',
        ),
      writeAttributes: new cognito.ClientAttributes(),
    });

    // =========================================================================
    // 3. Super Admin Seed (CloudFormation Custom Resource - one-time)
    // =========================================================================
    // Creates superadmin@his-platform.internal with FORCE_CHANGE_PASSWORD status.
    // Temp password is generated inside the Lambda (never in CDK context),
    // then stored in Secrets Manager at his/super-admin/temp-credentials (REQ-NF-009).

    const seederRole = new iam.Role(this, 'SuperAdminSeederRole', {
      roleName: 'his-super-admin-seeder-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      description: 'HIS super-admin seeder - adminCreateUser on HisUserPool and Secrets Manager secret creation',
    });

    // Scoped to this User Pool only (not wildcard)
    seederRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CognitoUserPoolAdmin',
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:ListUsers',
      ],
      resources: [this.userPool.userPoolArn],
    }));

    // Scoped to the super-admin secret path only (not wildcard)
    seederRole.addToPolicy(new iam.PolicyStatement({
      sid: 'SecretManagerSuperAdmin',
      actions: [
        'secretsmanager:CreateSecret',
        'secretsmanager:PutSecretValue',
        'secretsmanager:DeleteSecret',
        'secretsmanager:DescribeSecret',
      ],
      resources: [
        `arn:aws:secretsmanager:${this.region}:${this.account}:secret:his/super-admin/*`,
      ],
    }));

    const seederFn = new nodejs.NodejsFunction(this, 'SuperAdminSeederFn', {
      functionName: 'his-super-admin-seeder',
      entry: path.join(__dirname, '../../src/handlers/super-admin-seeder.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      role: seederRole,
      timeout: cdk.Duration.minutes(2),
      memorySize: 256,
      // reservedConcurrentExecutions intentionally omitted: account concurrency limit
      // is 10 (sandbox). REQ-NF-021 is satisfied by the account ceiling. Re-enable
      // for production after requesting a concurrency quota increase to >= 1000.
      environment: {
        USER_POOL_ID: this.userPool.userPoolId,
        REGION: this.region,
        // No credentials here. The Lambda generates the temp password itself
        // and stores it in SM without it passing through CDK or env vars (REQ-NF-009).
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Provider pattern: framework Lambda (outside VPC) handles CF response URL.
    // seederFn completes synchronously (<< 15 min) so no isCompleteHandler needed.
    const seederProvider = new Provider(this, 'SuperAdminSeederProvider', {
      onEventHandler: seederFn,
    });

    // Version='v1' property: increment to re-seed (e.g. if user pool is recreated)
    new cdk.CustomResource(this, 'SuperAdminSeed', {
      serviceToken: seederProvider.serviceToken,
      resourceType: 'Custom::HisSuperAdminSeed',
      properties: {
        UserPoolId: this.userPool.userPoolId,
        Version: 'v3',
      },
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: 'HisUserPoolId',
      description: 'HIS Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: 'HisUserPoolClientId',
      description: 'HIS Cognito User Pool Client ID (web SPA)',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      exportName: 'HisUserPoolArn',
      description: 'HIS Cognito User Pool ARN (for API Gateway authorizer in Phase 5)',
    });
  }
}
