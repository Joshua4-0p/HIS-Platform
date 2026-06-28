import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HisBackendStack } from './his-backend-stack';
import { HisAuthStack } from './his-auth-stack';

export interface HisFrontendStackProps extends cdk.StackProps {
  backendStack: HisBackendStack;
  authStack: HisAuthStack;
}

// Phase 18: AWS Amplify Hosting (+ built-in CloudFront CDN)
// Implements: UI-001-011, REQ-NF-023/025/030
export class HisFrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HisFrontendStackProps) {
    super(scope, id, props);
    // Implemented in Phase 18
  }
}
