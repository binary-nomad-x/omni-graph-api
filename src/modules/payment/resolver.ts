import type { Context } from "@gql-prisma-api/types/context.js";
import type { Payment as PaymentModel } from "@prisma/client";
import type { ProcessPaymentInput, PaymentFilterInput } from "@gql-prisma-api/modules/payment/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Payment = {
  order: (parent: PaymentModel, _args: unknown, ctx: Context) => ctx.services.payment.resolvePaymentOrder(parent.orderId),
  refunds: (parent: PaymentModel, _args: unknown, ctx: Context) => ctx.services.payment.resolvePaymentRefunds(parent.id),
};

export const Query = {
  myPayments: async (_parent: unknown, args: PaymentFilterInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.payment.getMyPayments(ctx.userId, args);
  },

  payment: async (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.payment.getPayment(ctx.userId, id);
  },
};

export const Mutation = {
  processPayment: async (_parent: unknown, { input }: { input: ProcessPaymentInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.payment.processPayment(ctx.userId, input);
  },
};
