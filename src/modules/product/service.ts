import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from "@gql-prisma-api/modules/product/dto/index.js";
import { requireOwner } from "@gql-prisma-api/utils/errors.js";
import { clean } from "@gql-prisma-api/lib/core.js";

export class ProductService {
  constructor(private readonly core: PrismaClient) {}
  resolveProductSeller(productId: string) {
    return this.core.user.findUnique({ where: { id: productId } });
  }

  resolveProductCategory(productId: string) {
    return this.core.category.findUnique({ where: { id: productId } });
  }

  resolveProductOrderItems(productId: string) {
    return this.core.orderItem.findMany({ where: { productId } });
  }

  resolveProductReviews(productId: string) {
    return this.core.review.findMany({ where: { productId } });
  }

  resolveProductImages(productId: string) {
    return this.core.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
    });
  }

  resolveProductWishlistItems(productId: string) {
    return this.core.wishlistItem.findMany({ where: { productId } });
  }

  resolveProductReviewCount(productId: string) {
    return this.core.review.count({ where: { productId } });
  }

  async resolveProductAverageRating(productId: string) {
    const agg = await this.core.review.aggregate({
      where: { productId },
      _avg: { rating: true },
    });
    return agg._avg.rating;
  }

  async createProduct(userId: string, input: CreateProductInput) {
    const { categorySlug, ...data } = input;
    const createData: Prisma.ProductCreateInput = clean({
      ...data,
      stock: input.stock ?? 0,
      sellerId: userId,
      category: categorySlug ? { connect: { slug: categorySlug } } : undefined,
    }) as unknown as Prisma.ProductCreateInput;
    return this.core.product.create({ data: createData });
  }

  async updateProduct(userId: string, id: string, input: UpdateProductInput) {
    const product = await this.core.product.findUnique({ where: { id } });
    if (!product) throw new Error("Product not found");
    requireOwner(product.sellerId, userId);
    const { categorySlug, ...data } = input;
    const updateData: Prisma.ProductUpdateInput = clean({
      ...data,
      ...(categorySlug !== undefined
        ? {
            category: categorySlug ? { connect: { slug: categorySlug } } : { disconnect: true },
          }
        : {}),
    }) as unknown as Prisma.ProductUpdateInput;
    return this.core.product.update({ where: { id }, data: updateData });
  }

  async deleteProduct(userId: string, id: string) {
    const product = await this.core.product.findUnique({ where: { id } });
    if (!product) throw new Error("Product not found");
    requireOwner(product.sellerId, userId);
    await this.core.product.delete({ where: { id } });
    return true;
  }

  getProducts(args: ProductFilterInput) {
    const conditions: Prisma.ProductWhereInput[] = [];

    if (args.categorySlug) {
      conditions.push({ category: { slug: args.categorySlug } });
    }

    if (args.search) {
      conditions.push({
        OR: [{ name: { contains: args.search, mode: "insensitive" } }, { description: { contains: args.search, mode: "insensitive" } }],
      });
    }

    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      const priceFilter: Prisma.FloatFilter = {};
      if (args.minPrice !== undefined) priceFilter.gte = args.minPrice;
      if (args.maxPrice !== undefined) priceFilter.lte = args.maxPrice;
      conditions.push({ price: priceFilter });
    }

    const where: Prisma.ProductWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    return this.core.product.findMany({
      where,
      take: args.limit ?? 20,
      skip: args.offset ?? 0,
      orderBy: { createdAt: "desc" },
    });
  }

  getProduct(id: string) {
    return this.core.product.findUnique({ where: { id } });
  }

  getProductBySku(sku: string) {
    return this.core.product.findUnique({ where: { sku } });
  }
}
