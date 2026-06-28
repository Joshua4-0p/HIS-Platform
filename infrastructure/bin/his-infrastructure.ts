#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HisVpcStack } from '../lib/stacks/his-vpc-stack';
import { HisDatabaseStack } from '../lib/stacks/his-database-stack';
import { HisAuthStack } from '../lib/stacks/his-auth-stack';
import { HisBackendStack } from '../lib/stacks/his-backend-stack';
import { HisFrontendStack } from '../lib/stacks/his-frontend-stack';
import { HisObservabilityStack } from '../lib/stacks/his-observability-stack';

const app = new cdk.App();

// us-east-1 for MVP (Section 2.4.1 SRS v2.0)
// Migration to af-south-1 is a production requirement for Cameroon data residency
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

// Stack 1: VPC, subnets, security groups, VPC endpoints
const vpcStack = new HisVpcStack(app, 'HisVpcStack', { env });

// Stack 2: RDS PostgreSQL 15 + Flyway migrations (Phase 2)
const databaseStack = new HisDatabaseStack(app, 'HisDatabaseStack', { env, vpcStack });
databaseStack.addDependency(vpcStack);

// Stack 3: Cognito User Pool + auth-service Lambda (Phase 3)
// auth-service has no VPC attachment - calls Cognito over the internet
const authStack = new HisAuthStack(app, 'HisAuthStack', { env });

// Stack 4: API Gateway + 9 VPC-bound Lambda functions (Phases 4-17)
const backendStack = new HisBackendStack(app, 'HisBackendStack', {
  env,
  vpcStack,
  databaseStack,
  authStack,
});
backendStack.addDependency(databaseStack);
backendStack.addDependency(authStack);

// Stack 5: AWS Amplify hosting (Phase 18)
const frontendStack = new HisFrontendStack(app, 'HisFrontendStack', {
  env,
  backendStack,
  authStack,
});
frontendStack.addDependency(backendStack);

// Stack 6: CloudWatch dashboards, alarms, CloudTrail (Phase 18)
const observabilityStack = new HisObservabilityStack(app, 'HisObservabilityStack', {
  env,
  backendStack,
});
observabilityStack.addDependency(backendStack);
