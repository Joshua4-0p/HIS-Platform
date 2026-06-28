import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface HisLambdaProps {
  functionName: string;
  entry: string;
  role: iam.IRole;
  vpc?: ec2.IVpc;
  securityGroups?: ec2.ISecurityGroup[];
  environment?: Record<string, string>;
  timeout?: cdk.Duration;
  memorySize?: number;
}

/**
 * Shared Lambda construct enforcing HIS-wide standards on every function:
 * - Node.js 20 runtime + esbuild bundling
 * - PRIVATE_ISOLATED subnet placement when VPC is provided (REQ-NF-013)
 * - Caller-provided IAM role (per-Lambda least-privilege, no wildcards)
 * reservedConcurrentExecutions omitted: sandbox account ceiling is 10.
 * Re-enable per-function in production after concurrency quota increase >= 1000 (REQ-NF-021).
 */
export class HisLambdaFunction extends Construct {
  public readonly fn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: HisLambdaProps) {
    super(scope, id);

    this.fn = new nodejs.NodejsFunction(this, 'Fn', {
      functionName: props.functionName,
      entry: props.entry,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      vpc: props.vpc,
      vpcSubnets: props.vpc
        ? { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
        : undefined,
      securityGroups: props.securityGroups,
      role: props.role,
      environment: props.environment,
      timeout: props.timeout ?? cdk.Duration.seconds(30),
      memorySize: props.memorySize ?? 512,
      bundling: {
        minify: true,
        sourceMap: false,
        // AWS SDK v3 is provided by the Lambda runtime - exclude from bundle
        externalModules: ['@aws-sdk/*'],
      },
    });
  }
}
