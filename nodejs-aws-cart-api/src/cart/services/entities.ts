import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum CartStatus {
    OPEN = 'OPEN',
    ORDERED = 'ORDERED',
}

@Entity('carts')
export class CartEntity {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    user_id: string;

    @Column({
        type: 'enum',
        enum: CartStatus,
        default: CartStatus.OPEN,
    })
    status: CartStatus;

    @OneToMany(() => CartItemEntity, (cartItem) => cartItem.cart)
    cartItems: CartItemEntity[];
}

@Entity('cart_items')
export class CartItemEntity {
    @PrimaryGeneratedColumn()
    id: string;

    @ManyToOne(() => CartEntity, (cart) => cart.cartItems)
    cart: CartEntity;

    @Column()
    product_id: string;

    @Column()
    count: number;
}
