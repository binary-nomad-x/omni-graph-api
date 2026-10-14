import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateInvoiceInput, InvoiceFilterInput } from "@gql-prisma-api/modules/invoice/dto/index.js";
import { triggerNovuWorkflow } from "@gql-prisma-api/utils/novu.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

export class InvoiceService {
  constructor(private readonly core: PrismaClient) {}

  resolveInvoiceOrder(orderId: string) {
    return this.core.order.findUnique({ where: { id: orderId } });
  }

  async findMyInvoices(userId: string, filter?: InvoiceFilterInput) {
    const conditions: Prisma.InvoiceWhereInput[] = [{ order: { userId } }];

    if (filter?.status) {
      conditions.push({ status: filter.status });
    }

    const where: Prisma.InvoiceWhereInput = { AND: conditions };

    return this.core.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      take: filter?.limit ?? 20,
      skip: filter?.offset ?? 0,
      include: { order: true },
    });
  }

  async findInvoiceById(userId: string, id: string) {
    const invoice = await this.core.invoice.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    return invoice;
  }

  async createInvoice(userId: string, input: CreateInvoiceInput) {
    const order = await this.core.order.findUnique({
      where: { id: input.orderId },
      include: { user: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const invoice = await this.core.invoice.create({
      data: {
        orderId: input.orderId,
        invoiceNumber,
        amount: order.totalAmount,
        dueDate: new Date(input.dueDate),
      },
      include: { order: true },
    });

    await this.core.notification.create({
      data: {
        userId: order.userId,
        type: "INVOICE_CREATED",
        title: "Invoice Created",
        message: `Invoice ${invoiceNumber} for $${order.totalAmount.toFixed(2)} has been created.`,
      },
    });

    await triggerNovuWorkflow(userId!, "invoice-created", {
      invoiceId: invoice.id,
      invoiceNumber,
      amount: order.totalAmount,
    });
    logger.info("Invoice created", {
      invoiceId: invoice.id,
      orderId: input.orderId,
      userId,
    });
    return invoice;
  }

  async markInvoicePaid(userId: string, id: string) {
    const invoice = await this.core.invoice.findUnique({
      where: { id },
      include: { order: { include: { user: true } } },
    });

    if (!invoice) throw new Error("Invoice not found");

    const updated = await this.core.invoice.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
      include: { order: true },
    });

    await this.core.notification.create({
      data: {
        userId: invoice.order.userId,
        type: "INVOICE_PAID",
        title: "Invoice Paid",
        message: `Invoice ${invoice.invoiceNumber} has been paid.`,
      },
    });

    await triggerNovuWorkflow(userId!, "invoice-paid", {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    });
    logger.info("Invoice marked paid", { invoiceId: id, userId });
    return updated;
  }

  async cancelInvoice(userId: string, id: string) {
    const invoice = await this.core.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "PAID") throw new Error("Cannot cancel a paid invoice");

    const updated = await this.core.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { order: true },
    });

    logger.info("Invoice cancelled", { invoiceId: id, userId });
    return updated;
  }
}
