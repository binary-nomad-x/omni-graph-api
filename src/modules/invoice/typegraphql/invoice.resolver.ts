import "reflect-metadata";
import { Arg, Ctx, Field, Float, InputType, Mutation, ObjectType, Query, ID } from "type-graphql";
import { InvoiceObject } from "./invoice.graphql.js";
import { CreateInvoiceInputType } from "./invoice.graphql.js";
import type { Context } from "@gql-prisma-api/types/context.js";

export { InvoiceObject, CreateInvoiceInputType };

@InputType("InvoiceFilterInput")
export class InvoiceFilterInputType {
  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Number, { nullable: true })
  limit?: number;

  @Field(() => Number, { nullable: true })
  offset?: number;
}

export class InvoiceResolver {
  @Query(() => [InvoiceObject], { nullable: true })
  async myInvoices(@Ctx() ctx: Context, @Arg("filter", () => InvoiceFilterInputType, { nullable: true }) filter?: InvoiceFilterInputType) {
    if (!ctx.userId) throw new Error("Unauthorized");
    return (await ctx.services.invoice.findMyInvoices(ctx.userId, filter as any)) as any;
  }

  @Query(() => InvoiceObject, { nullable: true })
  async invoice(@Ctx() ctx: Context, @Arg("id", () => String) id: string) {
    if (!ctx.userId) throw new Error("Unauthorized");
    return (await ctx.services.invoice.findInvoiceById(ctx.userId, id)) as any;
  }

  @Mutation(() => InvoiceObject, { nullable: true })
  async createInvoice(@Ctx() ctx: Context, @Arg("input", () => CreateInvoiceInputType) input: CreateInvoiceInputType) {
    if (!ctx.userId) throw new Error("Unauthorized");
    return (await ctx.services.invoice.createInvoice(ctx.userId, input as any)) as any;
  }

  @Mutation(() => Boolean)
  async markInvoicePaid(@Ctx() ctx: Context, @Arg("id", () => String) id: string) {
    if (!ctx.userId) throw new Error("Unauthorized");
    await ctx.services.invoice.markInvoicePaid(ctx.userId, id);
    return true;
  }

  @Mutation(() => Boolean)
  async cancelInvoice(@Ctx() ctx: Context, @Arg("id", () => String) id: string) {
    if (!ctx.userId) throw new Error("Unauthorized");
    await ctx.services.invoice.cancelInvoice(ctx.userId, id);
    return true;
  }
}
