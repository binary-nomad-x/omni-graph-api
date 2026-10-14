import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { InvoiceResolver } from "./invoice.resolver.js";

export async function createInvoiceCodeFirstSchema() {
  return buildSchema({
    resolvers: [InvoiceResolver],
    validate: false,
  });
}
