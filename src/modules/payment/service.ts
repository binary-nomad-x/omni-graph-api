import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProcessPaymentInput, PaymentFilterInput } from "@gql-prisma-api/modules/payment/dto/index.js";
import { requireOwner } from "@gql-prisma-api/utils/errors.js";
import { triggerNovuWorkflow } from "@gql-prisma-api/utils/novu.js";

export class PaymentService {
  constructor(private readonly core: PrismaClient) {}
  resolvePaymentOrder(orderId: string) {
    return this.core.order.findUnique({ where: { id: orderId } });
  }

  resolvePaymentRefunds(paymentId: string) {
    return this.core.refund.findMany({ where: { paymentId } });
  }

  async processPayment(userId: string, input: ProcessPaymentInput) {
    const order = await this.core.order.findUnique({
      where: { id: input.orderId },
    });
    if (!order) throw new Error("Order not found");
    requireOwner(order.userId, userId);

    const existing = await this.core.payment.findUnique({
      where: { orderId: input.orderId },
    });
    if (existing) throw new Error("Payment already exists");

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const payment = await this.core.payment.create({
      data: {
        orderId: input.orderId,
        amount: order.totalAmount,
        method: input.method,
        status: "COMPLETED",
        transactionId,
      },
    });

    await triggerNovuWorkflow(userId, "payment-processed", {
      orderId: input.orderId,
      paymentId: payment.id,
      amount: order.totalAmount,
    });

    return payment;
  }

  async getMyPayments(userId: string, args: PaymentFilterInput) {
    const conditions: Prisma.PaymentWhereInput[] = [{ order: { userId } }];

    if (args.status) {
      conditions.push({ status: args.status });
    }

    const where: Prisma.PaymentWhereInput = { AND: conditions };

    return this.core.payment.findMany({
      where,
      take: args.limit ?? 20,
      skip: args.offset ?? 0,
      orderBy: { createdAt: "desc" },
    });
  }

  async getPayment(userId: string, id: string) {
    return this.core.payment.findFirst({
      where: { id, order: { userId } },
    });
  }
}
