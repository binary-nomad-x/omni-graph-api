import { requireAuth } from "@gql-prisma-api/utils/errors.js";
import type { Context } from "@gql-prisma-api/types/context.js";
import type { Coupon as CouponModel } from "@prisma/client";
import type { CreateCouponInput } from "@gql-prisma-api/modules/coupon/dto/index.js";

export const Coupon = {
  orders: (parent: CouponModel, _args: unknown, ctx: Context) => ctx.services.coupon.resolveCouponOrders(parent.id),
};

export const Query = {
  couponByCode: (_parent: unknown, { code }: { code: string }, ctx: Context) => ctx.services.coupon.getCouponByCode(code),
};

export const Mutation = {
  createCoupon: (_parent: unknown, { input }: { input: CreateCouponInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.coupon.createCoupon(ctx.userId, input);
  },
};
