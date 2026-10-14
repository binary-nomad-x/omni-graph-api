import type { PrismaClient } from "@prisma/client";
import type { CreateShipmentInput } from "@gql-prisma-api/modules/shipment/dto/index.js";
import { triggerNovuWorkflow } from "@gql-prisma-api/utils/novu.js";

export class ShipmentService {
  constructor(private readonly core: PrismaClient) {}

  resolveShipmentOrder(orderId: string) {
    return this.core.order.findUnique({ where: { id: orderId } });
  }

  async createShipment(userId: string, input: CreateShipmentInput) {
    return this.core.shipment.create({ data: input });
  }

  async updateShipmentStatus(userId: string, id: string, status: string) {
    const shipment = await this.core.shipment.update({
      where: { id },
      data: { status },
    });

    const order = await this.core.order.findUnique({
      where: { id: shipment.orderId },
    });

    if (order) {
      await triggerNovuWorkflow(order.userId, "shipment-updated", {
        shipmentId: id,
        orderId: shipment.orderId,
        status,
      });
    }

    return shipment;
  }

  async getOrderShipments(userId: string, orderId: string) {
    return this.core.shipment.findMany({
      where: { orderId, order: { userId } },
    });
  }
}
