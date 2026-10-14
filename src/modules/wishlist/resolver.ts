import type { Context } from "@gql-prisma-api/types/context.js";
import type { Wishlist as WishlistModel, WishlistItem as WishlistItemModel } from "@prisma/client";
import type { CreateWishlistInput, AddToWishlistInput } from "@gql-prisma-api/modules/wishlist/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Wishlist = {
  user: (parent: WishlistModel, _args: unknown, ctx: Context) => ctx.services.wishlist.resolveWishlistUser(parent.userId),
  items: (parent: WishlistModel, _args: unknown, ctx: Context) => ctx.services.wishlist.resolveWishlistItems(parent.id),
  itemCount: (parent: WishlistModel, _args: unknown, ctx: Context) => ctx.services.wishlist.resolveWishlistItemCount(parent.id),
};

export const WishlistItem = {
  wishlist: (parent: WishlistItemModel, _args: unknown, ctx: Context) => ctx.services.wishlist.resolveWishlistItemWishlist(parent.wishlistId),
  product: (parent: WishlistItemModel, _args: unknown, ctx: Context) => ctx.services.wishlist.resolveWishlistItemProduct(parent.productId),
};

export const Query = {
  myWishlists: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.wishlist.getMyWishlists(ctx.userId);
  },

  wishlist: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.wishlist.getWishlist(ctx.userId, id);
  },
};

export const Mutation = {
  createWishlist: (_parent: unknown, { input }: { input: CreateWishlistInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.wishlist.createWishlist(ctx.userId, input);
  },

  addToWishlist: (_parent: unknown, { input }: { input: AddToWishlistInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.wishlist.addToWishlist(ctx.userId, input);
  },

  removeFromWishlist: (_parent: unknown, args: { wishlistId: string; productId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.wishlist.removeFromWishlist(ctx.userId, args.wishlistId, args.productId);
  },

  deleteWishlist: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.wishlist.deleteWishlist(ctx.userId, id);
  },
};
