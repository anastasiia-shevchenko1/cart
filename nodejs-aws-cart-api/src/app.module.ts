import { Module } from '@nestjs/common';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity, CartItemEntity } from './cart/services/entities';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfigService } from './database-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService,
    }),
    TypeOrmModule.forFeature([CartEntity, CartItemEntity]),
    AuthModule,
    CartModule,
    OrderModule,
  ],
  controllers: [
    AppController,
  ],
  providers: [DatabaseConfigService],
})
export class AppModule {}
