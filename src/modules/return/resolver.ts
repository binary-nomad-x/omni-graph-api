import type { Context } from "@gql-prisma-api/types/context.js";
import type { ReturnRequest as ReturnRequestModel } from "@prisma/client";
import type { CreateReturnInput, ReturnFilterInput } from "@gql-prisma-api/modules/return/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Query = {
  myReturns: (_parent: unknown, args: ReturnFilterInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.return.findMyReturns(ctx.userId, args);
  },
  returnRequest: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.return.findReturnById(ctx.userId, id);
  },
};

export const Mutation = {
  createReturn: (_parent: unknown, { input }: { input: CreateReturnInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.return.createReturn(ctx.userId, input);
  },
  approveReturn: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.return.approveReturn(ctx.userId, id);
  },
  rejectReturn: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.return.rejectReturn(ctx.userId, id);
  },
};

export const ReturnRequest = {
  orderItem: (parent: ReturnRequestModel, _args: unknown, ctx: Context) => ctx.services.return.resolveReturnRequestOrderItem(parent.orderItemId),
  user: (parent: ReturnRequestModel, _args: unknown, ctx: Context) => ctx.services.return.resolveReturnRequestUser(parent.userId),
};
