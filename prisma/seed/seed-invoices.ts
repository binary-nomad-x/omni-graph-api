import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";

export async function seedInvoices(ctx: SeedContext, counts: SeedCounts, orderIds: string[]): Promise<void> {
  const orders = await ctx.prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: {
      id: true,
      totalAmount: true,
      subtotal: true,
      taxAmount: true,
      discountAmount: true,
      status: true,
      shippingAddress: true,
    },
  });

  const data: {
    orderId: string;
    invoiceNumber: string;
    amount: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    status: string;
    notes: string | null;
    billingAddress: string;
    shippingAddress: string;
    pdfUrl: string | null;
    items: object[];
    dueDate: Date;
    paidAt: Date | null;
    sentAt: Date | null;
  }[] = [];

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const invoiceNumber = `INV-${String(i + 1).padStart(6, "0")}`;
    const isPaid = order.status !== "PENDING" && order.status !== "CANCELLED";
    const isCancelled = order.status === "CANCELLED";

    data.push({
      orderId: order.id,
      invoiceNumber,
      amount: order.totalAmount,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      currency: "USD",
      status: isPaid ? "PAID" : isCancelled ? "CANCELLED" : "PENDING",
      notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
      billingAddress: faker.location.streetAddress(),
      shippingAddress: order.shippingAddress || faker.location.streetAddress(),
      pdfUrl: isPaid ? `https://cdn.example.com/invoices/${invoiceNumber}.pdf` : null,
      items: [
        { description: "Order items", quantity: 1, unitPrice: order.subtotal },
        { description: "Tax", quantity: 1, unitPrice: order.taxAmount },
        { description: "Discount", quantity: 1, unitPrice: -order.discountAmount },
      ],
      dueDate: faker.date.future(),
      paidAt: isPaid ? faker.date.past() : null,
      sentAt: isPaid ? faker.date.past() : null,
    });
  }

  await ctx.prisma.invoice.createMany({ data });
  counts.invoices += data.length;
}
