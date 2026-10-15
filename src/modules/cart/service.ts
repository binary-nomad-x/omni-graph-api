import type { Product, PrismaClient } from "@prisma/client";
import type { AddToCartInput, UpdateCartItemInput } from "@gql-prisma-api/modules/cart/dto/index.js";

export class CartService {
  constructor(private readonly core: PrismaClient) {}

  resolveCartUser(userId: string) {
    return this.core.user.findUnique({ where: { id: userId } });
  }

  resolveCartItems(cartId: string) {
    return this.core.cartItem.findMany({ where: { cartId }, include: { product: true } });
  }

  async resolveCartTotalAmount(cartId: string) {
    const items = await this.core.cartItem.findMany({
      where: { cartId },
      include: { product: true },
    });
    return items.reduce((sum: number, i: {
      product: Product;
      quantity: number
    }) => sum + i.product.price * i.quantity, 0);
  }

  resolveCartItemCount(cartId: string) {
    return this.core.cartItem.count({ where: { cartId } });
  }

  resolveCartItemCart(cartId: string) {
    return this.core.cart.findUnique({ where: { id: cartId } });
  }

  resolveCartItemProduct(productId: string) {
    return this.core.product.findUnique({ where: { id: productId } });
  }

  private async getOrCreateCart(userId: string) {
    let cart = await this.core.cart.findUnique({ where: { userId } });
    if (!cart) cart = await this.core.cart.create({ data: { userId } });
    return cart;
  }

  async addToCart(userId: string, input: AddToCartInput) {
    const cart = await this.getOrCreateCart(userId);
    const existing = await this.core.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
    });
    if (existing) {
      await this.core.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (input.quantity ?? 1) },
      });
    } else {
      await this.core.cartItem.create({
        data: { cartId: cart.id, productId: input.productId, quantity: input.quantity ?? 1 },
      });
    }
    return this.core.cart.findUnique({ where: { id: cart.id } });
  }

  async updateCartItem(userId: string, input: UpdateCartItemInput) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.core.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
    });
    if (!item) throw new Error("Item not in cart");
    await this.core.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
    return this.core.cart.findUnique({ where: { id: cart.id } });
  }

  async removeFromCart(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.core.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (item) await this.core.cartItem.delete({ where: { id: item.id } });
    return this.core.cart.findUnique({ where: { id: cart.id } });
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.core.cartItem.deleteMany({ where: { cartId: cart.id } });
    return cart;
  }

  async getMyCart(userId: string) {
    return this.core.cart.findUnique({ where: { userId } });
  }
}
