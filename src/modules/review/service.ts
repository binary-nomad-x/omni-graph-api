import type { PrismaClient } from "@prisma/client";
import type { CreateReviewInput } from "@gql-prisma-api/modules/review/dto/index.js";
import { requireOwner } from "@gql-prisma-api/utils/errors.js";
import { triggerNovuWorkflow } from "@gql-prisma-api/utils/novu.js";

export class ReviewService {
  constructor(private readonly core: PrismaClient) {}

  resolveReviewProduct(productId: string) {
    return this.core.product.findUnique({ where: { id: productId } });
  }

  resolveReviewUser(userId: string) {
    return this.core.user.findUnique({ where: { id: userId } });
  }

  async createReview(userId: string, input: CreateReviewInput) {
    if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be between 1 and 5");

    const product = await this.core.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found");

    const existing = await this.core.review.findUnique({
      where: { productId_userId: { productId: input.productId, userId } },
    });

    if (existing) throw new Error("Already reviewed this product");

    const review = await this.core.review.create({
      data: {
        rating: input.rating,
        title: input.title ?? undefined,
        content: input.content ?? undefined,
        productId: input.productId,
        userId,
      },
    });

    if (product.sellerId !== userId) {
      await triggerNovuWorkflow(product.sellerId, "review-received", {
        productId: input.productId,
        reviewId: review.id,
        rating: input.rating,
      });
    }

    return review;
  }

  async deleteReview(userId: string, id: string) {
    const review = await this.core.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");
    requireOwner(review.userId, userId);
    await this.core.review.delete({ where: { id } });
    return true;
  }

  getReviews(args: { productId: string; limit?: number; offset?: number }) {
    return this.core.review.findMany({
      where: { productId: args.productId },
      take: args.limit ?? 20,
      skip: args.offset ?? 0,
      orderBy: { createdAt: "desc" },
    });
  }

  getReview(id: string) {
    return this.core.review.findUnique({ where: { id } });
  }
}
