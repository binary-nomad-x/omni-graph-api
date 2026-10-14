import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateCouponInput } from "@gql-prisma-api/modules/coupon/dto/index.js";
import { clean } from "@gql-prisma-api/lib/core.js";

export class CouponService {
  constructor(private readonly core: PrismaClient) {}

  resolveCouponOrders(couponId: string) {
    return this.core.order.findMany({ where: { couponId } });
  }

  async createCoupon(userId: string, input: CreateCouponInput) {
    const data: Prisma.CouponCreateInput = clean(input as unknown as Record<string, unknown>) as Prisma.CouponCreateInput;
    return this.core.coupon.create({ data });
  }

  getCouponByCode(code: string) {
    return this.core.coupon.findUnique({ where: { code } });
  }
}
