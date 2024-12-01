import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity, CartItemEntity } from './cart/services/entities';

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD_SECRET } = process.env;

console.log('DB_PASSWORD_SECRET', DB_PASSWORD_SECRET);
console.log('DB_USER', DB_USER);
console.log('DB_NAME', DB_NAME);

@Module({
    imports: [
        AuthModule,
        CartModule,
        OrderModule,
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: DB_HOST,
            port: Number(DB_PORT),
            username: DB_USER,
            password: DB_PASSWORD_SECRET,
            database: DB_NAME,
            entities: [CartEntity, CartItemEntity],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
        }),
        TypeOrmModule.forFeature([CartEntity, CartItemEntity]),
    ],
    controllers: [
        AppController,
    ],
    providers:
        [],
})

export class AppModule {
}
