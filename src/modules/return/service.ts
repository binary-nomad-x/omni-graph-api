import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateReturnInput, ReturnFilterInput } from "@gql-prisma-api/modules/return/dto/index.js";
import { triggerNovuWorkflow } from "@gql-prisma-api/utils/novu.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

export class ReturnService {
  constructor(private readonly core: PrismaClient) {}
  resolveReturnRequestOrderItem(orderItemId: string) {
    return this.core.orderItem.findUnique({ where: { id: orderItemId } });
  }

  resolveReturnRequestUser(userId: string) {
    return this.core.user.findUnique({ where: { id: userId } });
  }

  async findMyReturns(userId: string, filter?: ReturnFilterInput) {
    const conditions: Prisma.ReturnRequestWhereInput[] = [{ userId }];

    if (filter?.status) {
      conditions.push({ status: filter.status });
    }

    const where: Prisma.ReturnRequestWhereInput = { AND: conditions };

    return this.core.returnRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: filter?.limit ?? 20,
      skip: filter?.offset ?? 0,
      include: {
        orderItem: { include: { product: true, order: true } },
        user: true,
      },
    });
  }

  async findReturnById(userId: string, id: string) {
    const record = await this.core.returnRequest.findUnique({
      where: { id },
      include: { orderItem: { include: { product: true, order: true } } },
    });
    if (!record) throw new Error("Return request not found");
    return record;
  }

  async createReturn(userId: string, input: CreateReturnInput) {
    const orderItem = await this.core.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: { order: { include: { user: true } }, product: true },
    });
    if (!orderItem) throw new Error("Order item not found");
    if (orderItem.order.userId !== userId) throw new Error("Unauthorized");
    if (input.quantity > orderItem.quantity) throw new Error("Return quantity exceeds ordered quantity");

    const record = await this.core.returnRequest.create({
      data: {
        orderItemId: input.orderItemId,
        userId,
        reason: input.reason,
        quantity: input.quantity,
      },
      include: { orderItem: true, user: true },
    });

    await this.core.notification.create({
      data: {
        userId: orderItem.order.userId,
        type: "RETURN_REQUESTED",
        title: "Return Requested",
        message: `Return request for ${orderItem.product?.name ?? "item"} has been submitted.`,
      },
    });

    await triggerNovuWorkflow(userId!, "return-requested", {
      returnId: record.id,
      reason: input.reason,
    });
    logger.info("Return request created", {
      returnId: record.id,
      orderItemId: input.orderItemId,
      userId,
    });
    return record;
  }

  async approveReturn(userId: string, id: string) {
    const record = await this.core.returnRequest.findUnique({
      where: { id },
      include: {
        orderItem: { include: { order: { include: { user: true } } } },
      },
    });
    if (!record) throw new Error("Return request not found");

    const updated = await this.core.returnRequest.update({
      where: { id },
      data: { status: "APPROVED", resolvedAt: new Date() },
      include: { orderItem: true, user: true },
    });

    await this.core.notification.create({
      data: {
        userId: record.userId,
        type: "RETURN_APPROVED",
        title: "Return Approved",
        message: "Your return request has been approved.",
      },
    });

    await triggerNovuWorkflow(userId!, "return-approved", {
      returnId: record.id,
    });
    logger.info("Return approved", { returnId: id, userId });
    return updated;
  }

  async rejectReturn(userId: string, id: string) {
    const record = await this.core.returnRequest.findUnique({
      where: { id },
      include: {
        orderItem: { include: { order: { include: { user: true } } } },
      },
    });
    if (!record) throw new Error("Return request not found");

    const updated = await this.core.returnRequest.update({
      where: { id },
      data: { status: "REJECTED", resolvedAt: new Date() },
      include: { orderItem: true, user: true },
    });

    await this.core.notification.create({
      data: {
        userId: record.userId,
        type: "RETURN_REJECTED",
        title: "Return Rejected",
        message: "Your return request has been rejected.",
      },
    });

    await triggerNovuWorkflow(userId!, "return-rejected", {
      returnId: record.id,
    });
    logger.info("Return rejected", { returnId: id, userId });
    return updated;
  }
}
