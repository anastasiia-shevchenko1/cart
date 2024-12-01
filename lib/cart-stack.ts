import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
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
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // RDS Database instance
    const dbInstance = new rds.DatabaseInstance(this, 'CartRDSInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_14 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false
    });

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
        DB_PASSWORD_SECRET: dbCredentialsSecret.secretValueFromJson('password').unsafeUnwrap(),
      },
      vpc,
      allowPublicSubnet: true,
      securityGroups: [dbInstance.connections.securityGroups[0]],
      timeout: cdk.Duration.seconds(30)
    });

    const api = new apigateway.LambdaRestApi(this, 'CartServiceApi', {
      handler: lambdaFunction,
      restApiName: 'Cart Service API',
      proxy: false,
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const cart = api.root.addResource('api').addResource('profile').addResource('cart');
    cart.addMethod('GET');  // GET /api/profile/cart
    cart.addMethod('PUT');  // PUT /api/profile/cart

    const checkout = cart.addResource('checkout');
    checkout.addMethod('POST'); // POST /api/profile/cart/checkout
  }
}
