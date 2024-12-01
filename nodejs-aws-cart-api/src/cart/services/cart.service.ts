import { Injectable } from '@nestjs/common';
import { Cart, CartStatuses } from '../models';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity, CartItemEntity, CartStatus } from './entities';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(CartEntity)
        private readonly cartRepository: Repository<CartEntity>,
        @InjectRepository(CartItemEntity)
        private readonly cartItemRepository: Repository<CartItemEntity>,
    ) {
    }

    async findByUserId(userId: string): Promise<Cart | null> {
        const cartEntities = await this.cartRepository.find({ where: { user_id: userId } });

        if (cartEntities.length) {
            const cartEntity = cartEntities[0];
            const itemsFromCartItemsEntity = await this.cartItemRepository.find({ where: { cart: { id: cartEntity.id } } });

            const items = itemsFromCartItemsEntity?.length
                ? itemsFromCartItemsEntity.map((item) => (
                    {
                        product: { id: item.product_id, title: 'string', description: 'description', price: 3 },
                        count: item.count,
                    }
                ))
                : [];

            return {
                id: cartEntity.id,
                status: cartEntity.status === CartStatus.OPEN ? CartStatuses.OPEN : CartStatuses.ORDERED,
                user_id: cartEntity.user_id,
                items,
            };
        }

        return null;
    }

    async createByUserId(userId: string): Promise<Cart> {
        const userCart = { user_id: userId, status: CartStatus.OPEN };
        const newCart = await this.cartRepository.create(userCart);

        await this.cartRepository.save(newCart);

        return {
            ...userCart,
            items: [],
            id: newCart.id,
            status: newCart.status === CartStatus.OPEN ? CartStatuses.OPEN : CartStatuses.ORDERED,
        };
    }

    async findOrCreateByUserId(userId: string): Promise<Cart> {
        const userCart = await this.findByUserId(userId);

        if (userCart) {
            return userCart;
        }

        // @ts-ignore
        return await this.createByUserId(userId);
    }

    async updateByUserId(userId: string, { items }: Cart): Promise<Cart> {
        const { id, ...rest } = await this.findOrCreateByUserId(userId);
        const updatedCartData = {
            user_id: rest.user_id,
            status: rest.status === CartStatuses.OPEN ? CartStatus.OPEN : CartStatus.ORDERED,
        };
        await this.cartRepository.update(id, updatedCartData);
        await this.cartItemRepository.delete({ cart: { id } });
        const cartItemsToInsert = items.map(({ product, count }) => ({
            cart: { id },
            product_id: product.id,
            count,
        }));
        await this.cartItemRepository.save(cartItemsToInsert);

        return this.findOrCreateByUserId(userId);
    }

    // @ts-ignore
    async removeByUserId(userId): void {
        await this.cartRepository.delete({ user_id: userId });
    }
}
