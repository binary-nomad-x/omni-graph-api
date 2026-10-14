import type { Context } from "@gql-prisma-api/types/context.js";
import type { User as UserModel } from "@prisma/client";
import type { IdArg } from "@gql-prisma-api/types/graphql.js";
import type { UpdateUserInput, UpdateProfileInput } from "@gql-prisma-api/modules/user/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const User = {
  profile: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserProfile(parent.id),
  posts: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserPosts(parent.id),
  comments: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserComments(parent.id),
  likes: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserLikes(parent.id),
  products: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserProducts(parent.id),
  orders: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserOrders(parent.id),
  reviews: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserReviews(parent.id),
  addresses: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserAddresses(parent.id),
  wishlists: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserWishlists(parent.id),
  cart: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserCart(parent.id),
  notifications: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserNotifications(parent.id),
  followers: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserFollowers(parent.id),
  following: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserFollowing(parent.id),
  savedPosts: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserSavedPosts(parent.id),
  postViews: (parent: UserModel, _args: unknown, ctx: Context) => ctx.services.user.resolveUserPostViews(parent.id),
};

export const Query = {
  users: (_parent: unknown, _args: unknown, ctx: Context) => ctx.services.user.getUsers(),
  user: (_parent: unknown, { id }: IdArg, ctx: Context) => ctx.services.user.getUser(id),
  me: (_parent: unknown, _args: unknown, ctx: Context) => ctx.services.user.getMe(ctx.userId),
};

export const Mutation = {
  updateUser: (_parent: unknown, args: { id: string; input: UpdateUserInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.user.updateUser(ctx.userId, args);
  },
  deleteUser: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.user.deleteUser(ctx.userId, id);
  },
  updateProfile: (_parent: unknown, args: UpdateProfileInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.user.updateProfile(ctx.userId, args);
  },
};
