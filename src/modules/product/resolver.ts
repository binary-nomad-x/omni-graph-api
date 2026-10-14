import { requireAuth } from "@gql-prisma-api/utils/errors.js";
import type { Context } from "@gql-prisma-api/types/context.js";
import type { Product as ProductModel } from "@prisma/client";
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from "@gql-prisma-api/modules/product/dto/index.js";

export const Product = {
  seller: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductSeller(parent.sellerId),
  category: (parent: ProductModel, _args: unknown, ctx: Context) =>
    parent.categoryId ? ctx.services.product.resolveProductCategory(parent.categoryId) : null,
  orderItems: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductOrderItems(parent.id),
  reviews: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductReviews(parent.id),
  images: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductImages(parent.id),
  wishlistItems: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductWishlistItems(parent.id),
  reviewCount: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductReviewCount(parent.id),
  averageRating: (parent: ProductModel, _args: unknown, ctx: Context) => ctx.services.product.resolveProductAverageRating(parent.id),
};

export const Query = {
  products: async (_parent: unknown, args: ProductFilterInput, ctx: Context) => ctx.services.product.getProducts(args),
  product: (_parent: unknown, { id }: { id: string }, ctx: Context) => ctx.services.product.getProduct(id),
  productBySku: (_parent: unknown, { sku }: { sku: string }, ctx: Context) => ctx.services.product.getProductBySku(sku),
};

export const Mutation = {
  createProduct: async (_parent: unknown, { input }: { input: CreateProductInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.product.createProduct(ctx.userId, input);
  },

  updateProduct: async (_parent: unknown, { id, input }: { id: string; input: UpdateProductInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.product.updateProduct(ctx.userId, id, input);
  },

  deleteProduct: async (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.product.deleteProduct(ctx.userId, id);
  },
};
