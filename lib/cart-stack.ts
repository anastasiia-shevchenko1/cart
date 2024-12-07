import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { join } from 'path';

export class CartStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Creating Database Credentials Secret
    const dbCredentialsSecret = new secretsmanager.Secret(this, 'CartDBCreds', {
      secretName: 'CartDBCredsName',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dbmasteruser' }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });

    // Create VPC for the resources
    const vpc = new ec2.Vpc(this, 'CartServiceVPC', {
      maxAzs: 3,
      natGateways: 1
    });

    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      parameters: {
        'rds.force_ssl': '1', // Force SSL
      },
    });

    // RDS Database instance
    const dbInstance = new rds.DatabaseInstance(this, 'CartRDSInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      multiAz: false,
      publiclyAccessible: true,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      databaseName: 'cartdb',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      parameterGroup,
    });

    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ],
    });

    lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [dbCredentialsSecret.secretArn],
    }));

    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'NestJsLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: join(__dirname, '..', 'nodejs-aws-cart-api', 'dist', 'main.lambda.js'),
      handler: 'handler',
      bundling: {
        externalModules: ['aws-sdk', '@nestjs/microservices', 'class-transformer', '@nestjs/websockets/socket-module', 'cache-manager', 'class-validator'],
      },
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_NAME: 'cartdb',
        DB_USER: 'dbmasteruser',
        DB_PASSWORD_SECRET: dbCredentialsSecret.secretArn,
      },
      vpc,
      allowPublicSubnet: true,
      securityGroups: [dbInstance.connections.securityGroups[0]],
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      role: lambdaExecutionRole,
    });

    dbInstance.connections.allowDefaultPortFrom(lambdaFunction);
    dbCredentialsSecret.grantRead(lambdaFunction);

    const api = new apigateway.RestApi(this, 'CartServiceApi', {
      restApiName: 'Cart Service API',
      description: 'This service serves cart API',
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    dbInstance.secret!.grantRead(lambdaFunction);
    dbInstance.secret!.grantWrite(lambdaFunction);
    dbInstance.connections.allowDefaultPortFrom(lambdaFunction);

    const cart = api.root.addResource('api').addResource('profile').addResource('cart');
    cart.addMethod('GET', lambdaIntegration);  // GET /api/profile/cart
    cart.addMethod('PUT', lambdaIntegration);  // PUT /api/profile/cart
  }
}
