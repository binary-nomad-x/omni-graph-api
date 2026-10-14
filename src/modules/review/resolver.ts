import { requireAuth } from "@gql-prisma-api/utils/errors.js";
import type { Context } from "@gql-prisma-api/types/context.js";
import type { Review as ReviewModel } from "@prisma/client";
import type { CreateReviewInput } from "@gql-prisma-api/modules/review/dto/index.js";

export const Review = {
  product: (parent: ReviewModel, _args: unknown, ctx: Context) => ctx.services.review.resolveReviewProduct(parent.productId),
  user: (parent: ReviewModel, _args: unknown, ctx: Context) => ctx.services.review.resolveReviewUser(parent.userId),
};

export const Query = {
  reviews: (_parent: unknown, args: { productId: string; limit?: number; offset?: number }, ctx: Context) => ctx.services.review.getReviews(args),
  review: (_parent: unknown, { id }: { id: string }, ctx: Context) => ctx.services.review.getReview(id),
};

export const Mutation = {
  createReview: (_parent: unknown, { input }: { input: CreateReviewInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.review.createReview(ctx.userId, input);
  },
  deleteReview: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.review.deleteReview(ctx.userId, id);
  },
};
