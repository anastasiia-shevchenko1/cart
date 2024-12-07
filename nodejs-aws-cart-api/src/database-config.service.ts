import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { CartEntity, CartItemEntity } from "./cart/services/entities";

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
    private secretsManagerClient = new SecretsManagerClient({ region: process.env.CDK_DEFAULT_REGION });

    constructor(private configService: ConfigService) {}

    async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
        const dbPasswordSecretId = this.configService.get<string>('DB_PASSWORD_SECRET');
        const command = new GetSecretValueCommand({ SecretId: dbPasswordSecretId });
        const data = await this.secretsManagerClient.send(command);
        const secret = JSON.parse(data.SecretString);

        return {
            type: 'postgres',
            host: this.configService.get<string>('DB_HOST'),
            port: this.configService.get<number>('DB_PORT'),
            username: this.configService.get<string>('DB_USER'),
            password: secret.password,
            database: this.configService.get<string>('DB_NAME'),
            ssl: {
                rejectUnauthorized: false
            },
            synchronize: true,
            entities: [CartEntity, CartItemEntity],
        };
    }
}