import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class HisVpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSg: ec2.SecurityGroup;
  public readonly rdsSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC: 10.0.0.0/16, 2 AZs, no NAT Gateway, ISOLATED private subnets only
    // auth-service Lambda has no VPC attachment (calls Cognito only)
    // 9 VPC-bound Lambdas + RDS live in these isolated subnets
    this.vpc = new ec2.Vpc(this, 'HisVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'his-private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // RDS security group - defined first so Lambda SG can reference it
    this.rdsSg = new ec2.SecurityGroup(this, 'HisRdsSg', {
      vpc: this.vpc,
      securityGroupName: 'his-rds-sg',
      description: 'HIS RDS PostgreSQL - inbound port 5432 from Lambda SG only',
      allowAllOutbound: false,
    });

    // Lambda security group for the 9 VPC-bound Lambda functions
    this.lambdaSg = new ec2.SecurityGroup(this, 'HisLambdaSg', {
      vpc: this.vpc,
      securityGroupName: 'his-lambda-sg',
      description: 'HIS Lambda functions - egress 5432 to RDS SG and 443 to VPC CIDR only',
      allowAllOutbound: false,
    });

    // Lambda egress: PostgreSQL to RDS SG only (REQ-NF-013)
    this.lambdaSg.addEgressRule(
      this.rdsSg,
      ec2.Port.tcp(5432),
      'Lambda to RDS PostgreSQL - IAM DB auth token'
    );

    // Lambda egress: HTTPS to VPC CIDR only (SNS VPC Interface Endpoint)
    this.lambdaSg.addEgressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Lambda to SNS via VPC Interface Endpoint'
    );

    // RDS ingress: port 5432 from Lambda SG only
    this.rdsSg.addIngressRule(
      this.lambdaSg,
      ec2.Port.tcp(5432),
      'RDS accepts connections from Lambda SG only'
    );

    // S3 VPC Gateway Endpoint - free, routes S3 traffic on AWS private network
    this.vpc.addGatewayEndpoint('HisS3GatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
    });

    // SNS VPC Interface Endpoint (~$7.20/month single-AZ)
    // Required by: lab-service, transfer-service, notification-service, bulk-ingestion
    // No Secrets Manager endpoint needed (IAM DB auth eliminates runtime SM calls)
    // Cognito-IDP endpoint added below for hospital-service (Phase 7) AdminCreateUser calls.
    // Single-AZ (us-east-1a) per SRS Section 2.5 $10/month MVP budget constraint.
    // Lambda functions in us-east-1b route to the endpoint via private DNS (cross-AZ TCP
    // within the VPC — acceptable latency for MVP; data transfer cost is negligible).
    new ec2.InterfaceVpcEndpoint(this, 'HisSnsInterfaceEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SNS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      privateDnsEnabled: true,
      securityGroups: [this.lambdaSg],
    });

    // Secrets Manager VPC Interface Endpoint
    // Required by migration-runner Lambda for GetSecretValueCommand (DB credentials).
    new ec2.InterfaceVpcEndpoint(this, 'HisSecretsManagerEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      privateDnsEnabled: true,
      securityGroups: [this.lambdaSg],
    });

    // Cognito User Pools VPC Interface Endpoint
    // Required by hospital-service Lambda (Phase 7) for AdminCreateUser/DisableUser/EnableUser.
    new ec2.InterfaceVpcEndpoint(this, 'HisCognitoEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.COGNITO_IDP,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      privateDnsEnabled: true,
      securityGroups: [this.lambdaSg],
    });

    // Stack outputs consumed by downstream stacks (cross-stack references)
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      exportName: 'HisVpcId',
      description: 'HIS VPC ID',
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.isolatedSubnets.map((s) => s.subnetId).join(','),
      exportName: 'HisPrivateSubnetIds',
      description: 'HIS isolated private subnet IDs (comma-separated)',
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSg.securityGroupId,
      exportName: 'HisLambdaSecurityGroupId',
      description: 'HIS Lambda security group ID',
    });

    new cdk.CfnOutput(this, 'RdsSecurityGroupId', {
      value: this.rdsSg.securityGroupId,
      exportName: 'HisRdsSecurityGroupId',
      description: 'HIS RDS security group ID',
    });
  }
}
