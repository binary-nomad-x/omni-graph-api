import type { PrismaClient } from "@prisma/client";
import type { CreateDiscountInput, UpdateDiscountInput } from "@gql-prisma-api/modules/discount/dto/index.js";
import { toDiscountCreate, toDiscountUpdate } from "@gql-prisma-api/lib/core.js";

export class DiscountService {
  constructor(private readonly core: PrismaClient) {}

  resolveDiscountProduct(productId: string) {
    return this.core.product.findUnique({ where: { id: productId } });
  }

  async createDiscount(userId: string, input: CreateDiscountInput) {
    const product = await this.core.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found");
    return this.core.discount.create({ data: toDiscountCreate(input) });
  }

  async updateDiscount(userId: string, id: string, input: UpdateDiscountInput) {
    return this.core.discount.update({
      where: { id },
      data: toDiscountUpdate(input),
    });
  }

  async deleteDiscount(userId: string, id: string) {
    await this.core.discount.delete({ where: { id } });
    return true;
  }

  getActiveDiscounts() {
    const now = new Date();
    return this.core.discount.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { createdAt: "desc" },
    });
  }

  getProductDiscounts(productId: string) {
    const now = new Date();
    return this.core.discount.findMany({
      where: {
        productId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }
}
