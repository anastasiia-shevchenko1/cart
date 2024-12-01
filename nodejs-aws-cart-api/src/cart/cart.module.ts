import { Module } from '@nestjs/common';

import { OrderModule } from '../order/order.module';
import { CartController } from './cart.controller';
import { CartService } from './services';
import { CartEntity, CartItemEntity } from './services/entities';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [ OrderModule, TypeOrmModule.forFeature([ CartEntity, CartItemEntity ]) ],
    providers: [ CartService ],
    controllers: [ CartController ]
})
export class CartModule {
}
