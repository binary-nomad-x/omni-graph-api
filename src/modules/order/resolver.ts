import type { Context } from "@gql-prisma-api/types/context.js";
import type { Order as OrderModel, OrderItem as OrderItemModel } from "@prisma/client";
import type { PlaceOrderInput, OrderFilterInput } from "@gql-prisma-api/modules/order/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Order = {
  user: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderUser(parent.userId),
  items: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderItems(parent.id),
  payment: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderPayment(parent.id),
  refunds: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderRefunds(parent.id),
  shipments: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderShipments(parent.id),
  coupon: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderCoupon(parent.couponId),
  itemCount: (parent: OrderModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderItemCount(parent.id),
};

export const OrderItem = {
  order: (parent: OrderItemModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderItemOrder(parent.orderId),
  product: (parent: OrderItemModel, _args: unknown, ctx: Context) => ctx.services.order.resolveOrderItemProduct(parent.productId),
};

export const Query = {
  myOrders: async (_parent: unknown, args: OrderFilterInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.order.getMyOrders(ctx.userId, args);
  },

  order: async (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.order.getOrder(ctx.userId, id);
  },

  orderShipments: (_parent: unknown, { orderId }: { orderId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.prisma.shipment.findMany({ where: { orderId } });
  },
};

export const Mutation = {
  placeOrder: async (_parent: unknown, { input }: { input: PlaceOrderInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.order.placeOrder(ctx.userId, input);
  },

  cancelOrder: async (_parent: unknown, { id }: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.order.cancelOrder(ctx.userId, id);
  },

  updateOrderStatus: async (_parent: unknown, { id, status }: { id: string; status: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.order.updateOrderStatus(ctx.userId, id, status);
  },
};
