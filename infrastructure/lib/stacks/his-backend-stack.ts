import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigw2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { HisVpcStack } from './his-vpc-stack';
import { HisDatabaseStack } from './his-database-stack';
import { HisAuthStack } from './his-auth-stack';

export interface HisBackendStackProps extends cdk.StackProps {
  vpcStack: HisVpcStack;
  databaseStack: HisDatabaseStack;
  authStack: HisAuthStack;
}

// Phase 5: API Gateway HTTP API v2 + S3 buckets + SQS DLQ + SNS topics + Shared Lambda Layer
// Phase 6-15: 9 VPC-bound Lambda function routes added progressively
// Implements: REQ-NF-011 (Cognito JWT), REQ-NF-013 (VPC), REQ-NF-009 (IAM DB auth),
//             REQ-NF-021 (concurrency 200), REQ-NF-024 (WAT logs)
export class HisBackendStack extends cdk.Stack {
  // API Gateway - routes added in Phases 6-15
  public readonly httpApi: apigw2.HttpApi;
  public readonly cognitoAuthorizer: HttpJwtAuthorizer;

  // Shared Lambda Layer (pre-compiled JS utilities)
  public readonly sharedLayer: lambda.LayerVersion;

  // S3 Buckets
  public readonly csvUploadsBucket: s3.Bucket;
  public readonly csvArchiveBucket: s3.Bucket;
  public readonly cloudTrailLogsBucket: s3.Bucket;

  // SQS DLQ for bulk-ingestion (Phase 12)
  public readonly bulkIngestionDlq: sqs.Queue;

  // SNS Topics (Phase 10-12 Lambdas publish to these)
  public readonly criticalLabAlertsTopic: sns.Topic;
  public readonly transferEventsTopic: sns.Topic;
  public readonly systemAlarmsTopic: sns.Topic;
  public readonly etlCompletionsTopic: sns.Topic;
  public readonly dailySummariesTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: HisBackendStackProps) {
    super(scope, id, props);

    const { userPool, userPoolClient } = props.authStack;
    const account = cdk.Stack.of(this).account;

    // =========================================================================
    // 1. Shared Lambda Layer
    // All VPC-bound Lambda functions (Phases 6-15) import from src/shared/*.ts
    // (bundled inline by NodejsFunction/esbuild). This layer provides the same
    // utilities as pre-compiled CommonJS for any non-NodejsFunction runtime.
    // =========================================================================
    this.sharedLayer = new lambda.LayerVersion(this, 'HisSharedLayer', {
      layerVersionName: 'his-shared-layer',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../src/shared-layer'),
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'HIS shared utilities - structured-logger, audit-logger, db-client, jwt-claims, response, permission-check',
    });

    // =========================================================================
    // 2. API Gateway HTTP API v2
    // CORS configured for Amplify frontend (Phase 18). Routes added per phase.
    // Throttle: 1000 RPS / 200 burst (REQ-NF-011; WAF is a production addition).
    // =========================================================================
    this.httpApi = new apigw2.HttpApi(this, 'HisHttpApi', {
      apiName: 'HisHttpApi',
      description: 'HIS Platform API - HTTP API v2',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw2.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Apply throttling to the $default stage (1000 RPS / 200 burst, REQ-NF-011)
    const defaultStage = this.httpApi.defaultStage!.node.defaultChild as apigw2.CfnStage;
    defaultStage.defaultRouteSettings = {
      throttlingRateLimit:  1000,
      throttlingBurstLimit: 200,
    };

    // Cognito JWT Authorizer - referenced when adding routes in Phases 6-15
    const issuerUrl = `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`;
    this.cognitoAuthorizer = new HttpJwtAuthorizer(
      'HisCognitoAuthorizer',
      issuerUrl,
      {
        jwtAudience:    [userPoolClient.userPoolClientId],
        authorizerName: 'HisCognitoAuthorizer',
      },
    );

    // =========================================================================
    // 3. S3 Buckets
    // All: BLOCK_ALL public access, S3_MANAGED encryption, enforceSSL (REQ-NF-007)
    // =========================================================================

    // CSV uploads: pre-signed PUT uploads for bulk patient ingestion (REQ-F-044)
    this.csvUploadsBucket = new s3.Bucket(this, 'CsvUploadsBucket', {
      bucketName: `his-csv-uploads-${account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CSV archive: processed files versioned, Glacier transition after 90 days (REQ-F-048)
    this.csvArchiveBucket = new s3.Bucket(this, 'CsvArchiveBucket', {
      bucketName: `his-csv-archive-${account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          id: 'glacier-after-90-days',
          enabled: true,
          transitions: [
            {
              storageClass:    s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudTrail logs: versioned, RETAIN, expire after 730 days (REQ-F-071)
    this.cloudTrailLogsBucket = new s3.Bucket(this, 'CloudTrailLogsBucket', {
      bucketName: `his-cloudtrail-logs-${account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          id: 'expire-after-2-years',
          enabled: true,
          expiration: cdk.Duration.days(730),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // =========================================================================
    // 4. SQS Dead Letter Queue - bulk-ingestion failure queue (REQ-F-044, Phase 12)
    // =========================================================================
    this.bulkIngestionDlq = new sqs.Queue(this, 'BulkIngestionDlq', {
      queueName:       'his-bulk-ingestion-dlq',
      retentionPeriod: cdk.Duration.days(14),
      encryption:      sqs.QueueEncryption.SQS_MANAGED,
    });

    // =========================================================================
    // 5. SNS Topics + email subscriptions
    // SNS subscription confirmation emails are sent on first deploy.
    // All recipients must confirm before they receive notifications.
    // =========================================================================

    // Critical lab results needing immediate clinician attention (REQ-F-041, REQ-F-066)
    this.criticalLabAlertsTopic = new sns.Topic(this, 'CriticalLabAlertsTopic', {
      topicName:   'his-critical-lab-alerts',
      displayName: 'HIS Critical Lab Alerts',
    });
    [
      'chifensama01@gmail.com',
      'josuefotseu02@gmail.com',
      'joshiboss04@gmail.com',
    ].forEach((email) =>
      this.criticalLabAlertsTopic.addSubscription(new subs.EmailSubscription(email)),
    );

    // Inter-hospital transfer approvals and status changes (REQ-F-051, REQ-F-054)
    this.transferEventsTopic = new sns.Topic(this, 'TransferEventsTopic', {
      topicName:   'his-transfer-events',
      displayName: 'HIS Transfer Events',
    });
    [
      'chifensama01@gmail.com',
      'josuefotseu02@gmail.com',
      'joshiboss04@gmail.com',
    ].forEach((email) =>
      this.transferEventsTopic.addSubscription(new subs.EmailSubscription(email)),
    );

    // CloudWatch alarms and system-level alerts (Phase 18 CloudWatch integration)
    this.systemAlarmsTopic = new sns.Topic(this, 'SystemAlarmsTopic', {
      topicName:   'his-system-alarms',
      displayName: 'HIS System Alarms',
    });
    this.systemAlarmsTopic.addSubscription(
      new subs.EmailSubscription('chifensama01@gmail.com'),
    );

    // Bulk CSV ingestion job completion notifications (REQ-F-047, Phase 12)
    this.etlCompletionsTopic = new sns.Topic(this, 'EtlCompletionsTopic', {
      topicName:   'his-etl-completions',
      displayName: 'HIS ETL Completions',
    });
    [
      'chifensama01@gmail.com',
      'josuefotseu02@gmail.com',
      'joshiboss04@gmail.com',
    ].forEach((email) =>
      this.etlCompletionsTopic.addSubscription(new subs.EmailSubscription(email)),
    );

    // Daily hospital summary emails at 08:00 WAT via pg_cron (REQ-F-067, Phase 13)
    this.dailySummariesTopic = new sns.Topic(this, 'DailySummariesTopic', {
      topicName:   'his-daily-summaries',
      displayName: 'HIS Daily Summaries',
    });
    this.dailySummariesTopic.addSubscription(
      new subs.EmailSubscription('chifensama01@gmail.com'),
    );

    // =========================================================================
    // 6. Phase 6: auth-service Lambda
    // No VPC - calls Cognito public endpoint only (REQ-NF-012).
    // Uses USER_PASSWORD_AUTH flow (client-side) - no Admin auth needed.
    // AdminSetUserPassword kept scoped to UserPool ARN for future super-admin use.
    // =========================================================================
    const authServiceRole = new iam.Role(this, 'AuthServiceRole', {
      roleName:  'his-auth-service-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // AdminSetUserPassword scoped to UserPool ARN (least-privilege, REQ-NF-009)
    authServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:  iam.Effect.ALLOW,
      actions: ['cognito-idp:AdminSetUserPassword'],
      resources: [userPool.userPoolArn],
    }));

    // Client-side Cognito APIs (USER_PASSWORD_AUTH flow) - no resource-level IAM
    authServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:  iam.Effect.ALLOW,
      actions: [
        'cognito-idp:InitiateAuth',
        'cognito-idp:RespondToAuthChallenge',
        'cognito-idp:GlobalSignOut',
        'cognito-idp:ForgotPassword',
        'cognito-idp:ConfirmForgotPassword',
        'cognito-idp:ChangePassword',
      ],
      resources: ['*'],
    }));

    const authServiceFn = new nodejs.NodejsFunction(this, 'AuthServiceFn', {
      functionName: 'his-auth-service',
      entry: path.join(__dirname, '../../lambda/auth-service/handler.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      role: authServiceRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID:    userPoolClient.userPoolClientId,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const authIntegration = new apigw2Integrations.HttpLambdaIntegration('AuthIntegration', authServiceFn);

    // Public routes - no JWT required (user is not yet authenticated)
    for (const routePath of [
      '/auth/login',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/change-password',
    ]) {
      this.httpApi.addRoutes({
        path:        routePath,
        methods:     [apigw2.HttpMethod.POST],
        integration: authIntegration,
      });
    }

    // Logout requires a valid JWT (user must be authenticated to sign out)
    this.httpApi.addRoutes({
      path:        '/auth/logout',
      methods:     [apigw2.HttpMethod.POST],
      integration: authIntegration,
      authorizer:  this.cognitoAuthorizer,
    });

    // =========================================================================
    // 7. Phase 7: hospital-service Lambda (VPC-bound, 19 routes)
    // Handles hospital onboarding, staff management, RBAC (REQ-F-001 to REQ-F-014)
    // IAM DB auth via rds-db:connect; Cognito Admin APIs; SNS system-alarms publish.
    // VPC placement requires Cognito VPC Interface Endpoint (added in HisVpcStack Phase 7).
    // =========================================================================
    const hospitalServiceRole = new iam.Role(this, 'HospitalServiceRole', {
      roleName: 'his-hospital-service-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // IAM DB auth (no Secrets Manager at runtime â€” REQ-NF-009)
    hospitalServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    // Cognito Admin APIs scoped to UserPool ARN (least-privilege)
    hospitalServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDisableUser',
        'cognito-idp:AdminEnableUser',
        'cognito-idp:AdminSetUserAttributes',
        'cognito-idp:AdminGetUser',
      ],
      resources: [userPool.userPoolArn],
    }));

    // SNS publish on system-alarms topic (hospital approval events)
    hospitalServiceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [this.systemAlarmsTopic.topicArn],
    }));

    const hospitalServiceFn = new nodejs.NodejsFunction(this, 'HospitalServiceFn', {
      functionName: 'his-hospital-service',
      entry: path.join(__dirname, '../../lambda/hospital-service/handler.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      role: hospitalServiceRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      // reservedConcurrentExecutions: 200 -- spec REQ-NF-021 requires 200 but this sandbox
      // account has a ceiling of 10. Request a Service Quotas increase for production.
      vpc: props.vpcStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        USER_POOL_ID:            userPool.userPoolId,
        SYSTEM_ALARMS_TOPIC_ARN: this.systemAlarmsTopic.topicArn,
        RDS_HOSTNAME:            props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:                props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:             'hisdb',
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const hospitalIntegration = new apigw2Integrations.HttpLambdaIntegration(
      'HospitalIntegration',
      hospitalServiceFn,
    );

    // Public route - no JWT required (hospital self-registration)
    this.httpApi.addRoutes({
      path: '/hospitals/register',
      methods: [apigw2.HttpMethod.POST],
      integration: hospitalIntegration,
    });

    // JWT routes - super admin only (hospital management)
    for (const { routePath, methods } of [
      { routePath: '/hospitals/pending',       methods: [apigw2.HttpMethod.GET] },
      { routePath: '/hospitals',               methods: [apigw2.HttpMethod.GET] },
      { routePath: '/hospitals/{id}',          methods: [apigw2.HttpMethod.GET] },
      { routePath: '/hospitals/{id}/approve',  methods: [apigw2.HttpMethod.POST] },
      { routePath: '/hospitals/{id}/reject',   methods: [apigw2.HttpMethod.POST] },
    ]) {
      this.httpApi.addRoutes({
        path: routePath,
        methods,
        integration: hospitalIntegration,
        authorizer: this.cognitoAuthorizer,
      });
    }

    // JWT routes - hospital staff/roles/settings (hospital admin)
    for (const { routePath, methods } of [
      { routePath: '/staff',                   methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.POST] },
      { routePath: '/staff/{id}',              methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.PUT] },
      { routePath: '/staff/{id}/role',         methods: [apigw2.HttpMethod.PUT] },
      { routePath: '/staff/{id}/deactivate',   methods: [apigw2.HttpMethod.POST] },
      { routePath: '/staff/{id}/activate',     methods: [apigw2.HttpMethod.POST] },
      { routePath: '/roles',                   methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.POST] },
      { routePath: '/roles/{id}',              methods: [apigw2.HttpMethod.PUT, apigw2.HttpMethod.DELETE] },
      { routePath: '/roles/history',           methods: [apigw2.HttpMethod.GET] },
      { routePath: '/settings/facility',       methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.PUT] },
    ]) {
      this.httpApi.addRoutes({
        path: routePath,
        methods,
        integration: hospitalIntegration,
        authorizer: this.cognitoAuthorizer,
      });
    }

    // =========================================================================
    // 8. Phase 8: patient-service Lambda (VPC-bound, 6 routes)
    // Handles patient registration, fuzzy search, dedup, consent, amendments.
    // pg_trgm GIN index used for sub-500ms search (REQ-NF-002, REQ-F-022).
    // =========================================================================
    const patientServiceRole = new iam.Role(this, 'PatientServiceRole', {
      roleName: 'his-patient-service-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // IAM DB auth - no Secrets Manager at runtime (REQ-NF-009)
    patientServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:  iam.Effect.ALLOW,
      actions: ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    const patientServiceFn = new nodejs.NodejsFunction(this, 'PatientServiceFn', {
      functionName: 'his-patient-service',
      entry: path.join(__dirname, '../../lambda/patient-service/handler.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      role: patientServiceRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc: props.vpcStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        RDS_HOSTNAME: props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:     props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:  'hisdb',
      },
      bundling: {
        minify:          true,
        sourceMap:       false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const patientIntegration = new apigw2Integrations.HttpLambdaIntegration(
      'PatientIntegration',
      patientServiceFn,
    );

    for (const { routePath, methods } of [
      { routePath: '/patients',                                     methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}',                               methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.PUT] },
      { routePath: '/patients/{id}/consent',                       methods: [apigw2.HttpMethod.PUT] },
      { routePath: '/patients/{id}/deactivate',                    methods: [apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}/amend/{recordType}/{recordId}', methods: [apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}/amendments',                   methods: [apigw2.HttpMethod.GET] },
      { routePath: '/users/me/permissions',                       methods: [apigw2.HttpMethod.GET] },
    ]) {
      this.httpApi.addRoutes({
        path:        routePath,
        methods,
        integration: patientIntegration,
        authorizer:  this.cognitoAuthorizer,
      });
    }

    // =========================================================================
    // 9. Phase 9: appointment-service Lambda (VPC-bound, 4 routes)
    // Scheduling, conflict detection, cancellation, clinician notifications.
    // REQ-F-029 to REQ-F-033: appointment CRUD + 409 conflict + appointment_created/cancelled notifications.
    // =========================================================================
    const appointmentServiceRole = new iam.Role(this, 'AppointmentServiceRole', {
      roleName:  'his-appointment-service-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // IAM DB auth - no Secrets Manager at runtime (REQ-NF-009)
    appointmentServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    const appointmentServiceFn = new nodejs.NodejsFunction(this, 'AppointmentServiceFn', {
      functionName: 'his-appointment-service',
      entry:        path.join(__dirname, '../../lambda/appointment-service/handler.ts'),
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      'handler',
      role:         appointmentServiceRole,
      timeout:      cdk.Duration.seconds(30),
      memorySize:   512,
      vpc:          props.vpcStack.vpc,
      vpcSubnets:   { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        RDS_HOSTNAME: props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:     props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:  'hisdb',
      },
      bundling: {
        minify:          true,
        sourceMap:       false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const appointmentIntegration = new apigw2Integrations.HttpLambdaIntegration(
      'AppointmentIntegration',
      appointmentServiceFn,
    );

    for (const { routePath, methods } of [
      { routePath: '/appointments',             methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.POST] },
      { routePath: '/appointments/{id}',        methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.PUT] },
      { routePath: '/appointments/{id}/cancel', methods: [apigw2.HttpMethod.PUT] },
    ]) {
      this.httpApi.addRoutes({
        path:        routePath,
        methods,
        integration: appointmentIntegration,
        authorizer:  this.cognitoAuthorizer,
      });
    }

    // =========================================================================
    // 10. Phase 10: clinical-service Lambda (VPC-bound, 7 routes)
    // Encounters, diagnoses, vital signs, prescriptions, lab requests.
    // Consent guard (REQ-F-016): Refused patients cannot have new clinical records.
    // encounter.staff_id = JWT userId (REQ-F-034, attending clinician auto-populated).
    // Clinical records are immutable (REQ-F-025) - no DELETE/UPDATE endpoints.
    // REQ-F-034 to REQ-F-038.
    // =========================================================================
    const clinicalServiceRole = new iam.Role(this, 'ClinicalServiceRole', {
      roleName:  'his-clinical-service-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // IAM DB auth - no Secrets Manager at runtime (REQ-NF-009)
    clinicalServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    const clinicalServiceFn = new nodejs.NodejsFunction(this, 'ClinicalServiceFn', {
      functionName: 'his-clinical-service',
      entry:        path.join(__dirname, '../../lambda/clinical-service/handler.ts'),
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      'handler',
      role:         clinicalServiceRole,
      timeout:      cdk.Duration.seconds(30),
      memorySize:   512,
      // reservedConcurrentExecutions: 200 -- spec REQ-NF-021 requires 200 but this sandbox
      // account has a ceiling of 10. Request a Service Quotas increase for production.
      vpc:          props.vpcStack.vpc,
      vpcSubnets:   { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        RDS_HOSTNAME: props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:     props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:  'hisdb',
      },
      bundling: {
        minify:          true,
        sourceMap:       false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const clinicalIntegration = new apigw2Integrations.HttpLambdaIntegration(
      'ClinicalIntegration',
      clinicalServiceFn,
    );

    for (const { routePath, methods } of [
      { routePath: '/encounters',                                   methods: [apigw2.HttpMethod.GET] },
      { routePath: '/patients/{id}/encounters',                     methods: [apigw2.HttpMethod.GET, apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}/encounters/{eid}',               methods: [apigw2.HttpMethod.GET] },
      { routePath: '/patients/{id}/encounters/{eid}/diagnoses',     methods: [apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}/encounters/{eid}/vitals',        methods: [apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}/encounters/{eid}/prescriptions', methods: [apigw2.HttpMethod.POST] },
      { routePath: '/patients/{id}/encounters/{eid}/lab-requests',  methods: [apigw2.HttpMethod.POST] },
    ]) {
      this.httpApi.addRoutes({
        path:        routePath,
        methods,
        integration: clinicalIntegration,
        authorizer:  this.cognitoAuthorizer,
      });
    }

    // =========================================================================
    // 11. Phase 11: lab-service Lambda (VPC-bound, 5 routes)
    // Lab work queue, result entry, result detail, versioned correction.
    // REQ-F-039: lab_test_requests work queue
    // REQ-F-040: reference range validation (normal/abnormal/critical)
    // REQ-F-041: critical alert via SNS + in-app notifications within 60s
    // REQ-F-025: versioned corrections - INSERT new row, supersede original
    // REQ-F-068: audit log on every read/write of patient lab data
    // =========================================================================
    const labServiceRole = new iam.Role(this, 'LabServiceRole', {
      roleName:  'his-lab-service-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    labServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    labServiceRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['sns:Publish'],
      resources: [this.criticalLabAlertsTopic.topicArn],
    }));

    const labServiceFn = new nodejs.NodejsFunction(this, 'LabServiceFn', {
      functionName: 'his-lab-service',
      entry:        path.join(__dirname, '../../lambda/lab-service/handler.ts'),
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      'handler',
      role:         labServiceRole,
      timeout:      cdk.Duration.seconds(30),
      memorySize:   512,
      // reservedConcurrentExecutions: 200 -- REQ-NF-021; raise Service Quotas for production
      vpc:          props.vpcStack.vpc,
      vpcSubnets:   { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        RDS_HOSTNAME:                   props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:                       props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:                    'hisdb',
        CRITICAL_LAB_ALERTS_TOPIC_ARN:  this.criticalLabAlertsTopic.topicArn,
      },
      bundling: {
        minify:          true,
        sourceMap:       false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const labIntegration = new apigw2Integrations.HttpLambdaIntegration(
      'LabIntegration',
      labServiceFn,
    );

    for (const { routePath, methods } of [
      { routePath: '/laboratory/queue',               methods: [apigw2.HttpMethod.GET] },
      { routePath: '/laboratory/requests/{id}',       methods: [apigw2.HttpMethod.GET] },
      { routePath: '/laboratory/results',             methods: [apigw2.HttpMethod.POST] },
      { routePath: '/laboratory/results/{id}',        methods: [apigw2.HttpMethod.GET] },
      { routePath: '/laboratory/results/{id}/correct', methods: [apigw2.HttpMethod.PUT] },
    ]) {
      this.httpApi.addRoutes({
        path:        routePath,
        methods,
        integration: labIntegration,
        authorizer:  this.cognitoAuthorizer,
      });
    }

    // =========================================================================
    // 12. Phase 12: bulk-upload-api Lambda (HTTP-triggered, VPC-bound, 3 routes)
    // Pre-signed S3 URL for CSV upload; job tracking; status polling.
    // REQ-F-044 to REQ-F-046: upload URL, job creation, job status query.
    // =========================================================================
    const bulkUploadApiRole = new iam.Role(this, 'BulkUploadApiRole', {
      roleName:  'his-bulk-upload-api-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // IAM DB auth - no Secrets Manager at runtime (REQ-NF-009)
    bulkUploadApiRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    // S3 pre-signed URL generation for template download and CSV PUT upload
    bulkUploadApiRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['s3:GetObject', 's3:PutObject'],
      resources: [`${this.csvUploadsBucket.bucketArn}/*`],
    }));

    const bulkUploadApiFn = new nodejs.NodejsFunction(this, 'BulkUploadApiFn', {
      functionName: 'his-bulk-upload-api',
      entry:        path.join(__dirname, '../../lambda/bulk-upload-api/handler.ts'),
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      'handler',
      role:         bulkUploadApiRole,
      timeout:      cdk.Duration.seconds(30),
      memorySize:   512,
      // reservedConcurrentExecutions: 200 -- REQ-NF-021; raise Service Quotas for production
      vpc:          props.vpcStack.vpc,
      vpcSubnets:   { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        RDS_HOSTNAME:       props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:           props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:        'hisdb',
        CSV_UPLOADS_BUCKET: this.csvUploadsBucket.bucketName,
      },
      bundling: {
        minify:          true,
        sourceMap:       false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    const bulkUploadApiIntegration = new apigw2Integrations.HttpLambdaIntegration(
      'BulkUploadApiIntegration',
      bulkUploadApiFn,
    );

    for (const { routePath, methods } of [
      { routePath: '/bulk-upload/template',       methods: [apigw2.HttpMethod.GET] },
      { routePath: '/bulk-upload/presigned-url',  methods: [apigw2.HttpMethod.POST] },
      { routePath: '/bulk-upload/status/{jobId}', methods: [apigw2.HttpMethod.GET] },
    ]) {
      this.httpApi.addRoutes({
        path:        routePath,
        methods,
        integration: bulkUploadApiIntegration,
        authorizer:  this.cognitoAuthorizer,
      });
    }

    // =========================================================================
    // 13. Phase 12: bulk-ingestion Lambda (S3-triggered, 15 min, DLQ)
    // Full ETL pipeline: validate structure, pg_trgm dedup (>0.85), batch insert,
    // archive to csv-archive, SNS completion notification.
    // REQ-F-044 to REQ-F-048, REQ-NF-006 (500 records/min at 1024 MB).
    // DLQ: his-bulk-ingestion-dlq receives failed invocations.
    // =========================================================================
    const bulkIngestionRole = new iam.Role(this, 'BulkIngestionRole', {
      roleName:  'his-bulk-ingestion-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // IAM DB auth (REQ-NF-009)
    bulkIngestionRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${account}:dbuser:*/his_app`],
    }));

    // Read uploaded CSV from csv-uploads bucket
    bulkIngestionRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['s3:GetObject'],
      resources: [`${this.csvUploadsBucket.bucketArn}/uploads/*`],
    }));

    // Write processed CSV to csv-archive bucket (REQ-F-048)
    bulkIngestionRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['s3:PutObject'],
      resources: [`${this.csvArchiveBucket.bucketArn}/*`],
    }));

    // SNS publish for ETL completion notification (REQ-F-047)
    bulkIngestionRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['sns:Publish'],
      resources: [this.etlCompletionsTopic.topicArn],
    }));

    // SQS SendMessage for DLQ on failed async invocations
    bulkIngestionRole.addToPolicy(new iam.PolicyStatement({
      effect:    iam.Effect.ALLOW,
      actions:   ['sqs:SendMessage'],
      resources: [this.bulkIngestionDlq.queueArn],
    }));

    const bulkIngestionFn = new nodejs.NodejsFunction(this, 'BulkIngestionFn', {
      functionName:   'his-bulk-ingestion',
      entry:          path.join(__dirname, '../../lambda/bulk-ingestion/handler.ts'),
      runtime:        lambda.Runtime.NODEJS_20_X,
      handler:        'handler',
      role:           bulkIngestionRole,
      timeout:        cdk.Duration.minutes(15),
      memorySize:     1024,
      deadLetterQueue: this.bulkIngestionDlq,
      vpc:            props.vpcStack.vpc,
      vpcSubnets:     { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.vpcStack.lambdaSg],
      environment: {
        RDS_HOSTNAME:             props.databaseStack.rdsInstance.dbInstanceEndpointAddress,
        RDS_PORT:                 props.databaseStack.rdsInstance.dbInstanceEndpointPort,
        RDS_DB_NAME:              'hisdb',
        CSV_UPLOADS_BUCKET:       this.csvUploadsBucket.bucketName,
        CSV_ARCHIVE_BUCKET:       this.csvArchiveBucket.bucketName,
        ETL_COMPLETIONS_TOPIC_ARN: this.etlCompletionsTopic.topicArn,
      },
      bundling: {
        minify:          true,
        sourceMap:       false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // S3 event source: trigger on object PUT under uploads/ prefix (REQ-F-044)
    bulkIngestionFn.addEventSource(new lambdaEventSources.S3EventSource(this.csvUploadsBucket, {
      events:  [s3.EventType.OBJECT_CREATED],
      filters: [{ prefix: 'uploads/' }],
    }));

    // =========================================================================
    // 14. Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value:      this.httpApi.apiEndpoint,
      exportName: 'HisApiGatewayUrl',
      description: 'HIS API Gateway HTTP API base URL',
    });

    new cdk.CfnOutput(this, 'SharedLayerArn', {
      value:      this.sharedLayer.layerVersionArn,
      exportName: 'HisSharedLayerArn',
      description: 'HIS shared Lambda layer ARN',
    });

    new cdk.CfnOutput(this, 'CsvUploadsBucketName', {
      value:      this.csvUploadsBucket.bucketName,
      exportName: 'HisCsvUploadsBucketName',
    });

    new cdk.CfnOutput(this, 'CsvArchiveBucketName', {
      value:      this.csvArchiveBucket.bucketName,
      exportName: 'HisCsvArchiveBucketName',
    });

    new cdk.CfnOutput(this, 'CloudTrailLogsBucketName', {
      value:      this.cloudTrailLogsBucket.bucketName,
      exportName: 'HisCloudTrailLogsBucketName',
    });

    new cdk.CfnOutput(this, 'BulkIngestionDlqUrl', {
      value:      this.bulkIngestionDlq.queueUrl,
      exportName: 'HisBulkIngestionDlqUrl',
    });

    new cdk.CfnOutput(this, 'BulkIngestionDlqArn', {
      value:      this.bulkIngestionDlq.queueArn,
      exportName: 'HisBulkIngestionDlqArn',
    });

    new cdk.CfnOutput(this, 'CriticalLabAlertsTopicArn', {
      value:      this.criticalLabAlertsTopic.topicArn,
      exportName: 'HisCriticalLabAlertsTopicArn',
    });

    new cdk.CfnOutput(this, 'TransferEventsTopicArn', {
      value:      this.transferEventsTopic.topicArn,
      exportName: 'HisTransferEventsTopicArn',
    });

    new cdk.CfnOutput(this, 'SystemAlarmsTopicArn', {
      value:      this.systemAlarmsTopic.topicArn,
      exportName: 'HisSystemAlarmsTopicArn',
    });

    new cdk.CfnOutput(this, 'EtlCompletionsTopicArn', {
      value:      this.etlCompletionsTopic.topicArn,
      exportName: 'HisEtlCompletionsTopicArn',
    });

    new cdk.CfnOutput(this, 'DailySummariesTopicArn', {
      value:      this.dailySummariesTopic.topicArn,
      exportName: 'HisDailySummariesTopicArn',
    });
  }
}
