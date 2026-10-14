import type { Context } from "@gql-prisma-api/types/context.js";
import type { Invoice as InvoiceModel } from "@prisma/client";
import type { CreateInvoiceInput, InvoiceFilterInput } from "@gql-prisma-api/modules/invoice/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Query = {
  myInvoices: (_parent: unknown, args: InvoiceFilterInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.invoice.findMyInvoices(ctx.userId, args);
  },
  invoice: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.invoice.findInvoiceById(ctx.userId, id);
  },
};

export const Mutation = {
  createInvoice: (_parent: unknown, { input }: { input: CreateInvoiceInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.invoice.createInvoice(ctx.userId, input);
  },
  markInvoicePaid: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.invoice.markInvoicePaid(ctx.userId, id);
  },
  cancelInvoice: (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.invoice.cancelInvoice(ctx.userId, id);
  },
};

export const Invoice = {
  order: (parent: InvoiceModel, _args: unknown, ctx: Context) => ctx.services.invoice.resolveInvoiceOrder(parent.orderId),
};
