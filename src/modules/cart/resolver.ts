import type { Context } from "@gql-prisma-api/types/context.js";
import type { Cart as CartModel, CartItem as CartItemModel } from "@prisma/client";
import type { AddToCartInput, UpdateCartItemInput } from "@gql-prisma-api/modules/cart/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Cart = {
  user: (parent: CartModel, _args: unknown, ctx: Context) => ctx.services.cart.resolveCartUser(parent.userId),
  items: (parent: CartModel, _args: unknown, ctx: Context) => ctx.services.cart.resolveCartItems(parent.id),
  totalAmount: (parent: CartModel, _args: unknown, ctx: Context) => ctx.services.cart.resolveCartTotalAmount(parent.id),
  itemCount: (parent: CartModel, _args: unknown, ctx: Context) => ctx.services.cart.resolveCartItemCount(parent.id),
};

export const CartItem = {
  cart: (parent: CartItemModel, _args: unknown, ctx: Context) => ctx.services.cart.resolveCartItemCart(parent.cartId),
  product: (parent: CartItemModel, _args: unknown, ctx: Context) => ctx.services.cart.resolveCartItemProduct(parent.productId),
};

export const Query = {
  myCart: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.cart.getMyCart(ctx.userId);
  },
};

export const Mutation = {
  addToCart: (_parent: unknown, { input }: { input: AddToCartInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.cart.addToCart(ctx.userId, input);
  },
  updateCartItem: (_parent: unknown, { input }: { input: UpdateCartItemInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.cart.updateCartItem(ctx.userId, input);
  },
  removeFromCart: (_parent: unknown, { productId }: { productId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.cart.removeFromCart(ctx.userId, productId);
  },
  clearCart: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.cart.clearCart(ctx.userId);
  },
};
