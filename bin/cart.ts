#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CartStack } from '../lib/cart-stack';

const app = new cdk.App();

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
};

new CartStack(app, 'CartStack', { env });