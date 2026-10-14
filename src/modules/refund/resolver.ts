import type { Context } from "@gql-prisma-api/types/context.js";
import type { Refund as RefundModel } from "@prisma/client";
import type { CreateRefundInput, RefundFilterInput } from "@gql-prisma-api/modules/refund/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Refund = {
  payment: (parent: RefundModel, _args: unknown, ctx: Context) => ctx.services.refund.resolveRefundPayment(parent.paymentId),
  order: (parent: RefundModel, _args: unknown, ctx: Context) => ctx.services.refund.resolveRefundOrder(parent.orderId),
};

export const Query = {
  myRefunds: async (_parent: unknown, args: RefundFilterInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.refund.getMyRefunds(ctx.userId, args);
  },

  refund: async (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.refund.getRefund(ctx.userId, id);
  },
};

export const Mutation = {
  createRefund: async (_parent: unknown, { input }: { input: CreateRefundInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.refund.createRefund(ctx.userId, input);
  },

  updateRefundStatus: async (_parent: unknown, { id, status }: { id: string; status: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.refund.updateRefundStatus(ctx.userId, id, status);
  },
};
