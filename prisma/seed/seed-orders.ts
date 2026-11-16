import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";
import { createManyChunked } from "./utils.js";

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export async function seedOrders(
  ctx: SeedContext,
  counts: SeedCounts,
  userIds: string[],
  productIds: string[],
  couponIds: string[],
): Promise<string[]> {
  const products = await ctx.prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, name: true, sku: true, imageUrl: true, stock: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const coupons = couponIds.length > 0 ? await ctx.prisma.coupon.findMany({ where: { id: { in: couponIds } } }) : [];
  const couponMap = new Map(coupons.map((c) => [c.id, c]));

  const orderIds = Array.from({ length: Math.floor(userIds.length * 4) }, () => crypto.randomUUID());

  const orderData: {
    id: string;
    userId: string;
    status: string;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    shippingAddress: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    source: string;
    isGift: boolean;
    giftMessage: string | null;
    trackingUrl: string | null;
    couponId: string | null;
    estimatedDelivery: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
  }[] = [];
  const itemData: {
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    productName: string;
    productSku: string;
    productImage?: string | null;
    discountAmount: number;
    taxAmount: number;
    totalPrice: number;
  }[] = [];

  for (const orderId of orderIds) {
    const status = faker.helpers.arrayElement(ORDER_STATUSES);
    const userId = faker.helpers.arrayElement(userIds);
    const couponId = couponIds.length > 0 && Math.random() > 0.65 ? faker.helpers.arrayElement(couponIds) : null;
    const isCancelled = status === "CANCELLED";
    const hasTracking = status === "SHIPPED" || status === "DELIVERED";
    const shippingAmount = parseFloat(faker.commerce.price({ min: 5, max: 25 }));
    const taxRate = faker.helpers.arrayElement([0.05, 0.07, 0.08, 0.1, 0.0]);

    const order: (typeof orderData)[number] = {
      id: orderId,
      userId,
      status,
      subtotal: 0,
      taxAmount: 0,
      shippingAmount,
      discountAmount: 0,
      totalAmount: 0,
      currency: "USD",
      shippingAddress: faker.location.streetAddress(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      notes: Math.random() > 0.4 ? faker.lorem.sentence() : null,
      source: faker.helpers.arrayElement(["web", "mobile", "api"]),
      isGift: Math.random() > 0.9,
      giftMessage: Math.random() > 0.9 ? faker.lorem.sentence() : null,
      trackingUrl: hasTracking ? `https://tracking.example.com/${faker.string.alphanumeric({ length: 12 }).toUpperCase()}` : null,
      couponId,
      estimatedDelivery: faker.date.future(),
      deliveredAt: status === "DELIVERED" ? faker.date.past() : null,
      cancelledAt: isCancelled ? faker.date.past() : null,
      cancelReason: isCancelled
        ? faker.helpers.arrayElement(["Changed mind", "Found better price", "Ordered by mistake", "Shipping too slow", "Duplicate order"])
        : null,
    };

    const itemCount = faker.number.int({ min: 1, max: 5 });
    let subtotal = 0;
    let itemDiscount = 0;

    for (let j = 0; j < itemCount; j++) {
      const productId = faker.helpers.arrayElement(productIds);
      const product = productMap.get(productId);
      if (!product) continue;
      const quantity = faker.number.int({ min: 1, max: 3 });
      const totalPrice = parseFloat((product.price * quantity).toFixed(2));
      const discountAmount =
        Math.random() > 0.4 ? parseFloat((totalPrice * faker.helpers.arrayElement([0.05, 0.1, 0.15, 0.2])).toFixed(2)) : 0;
      subtotal += totalPrice;
      itemDiscount += discountAmount;
      itemData.push({
        orderId,
        productId,
        quantity,
        unitPrice: product.price,
        productName: product.name,
        productSku: product.sku,
        productImage: product.imageUrl,
        discountAmount,
        taxAmount: parseFloat((totalPrice * taxRate).toFixed(2)),
        totalPrice,
      });
    }

    // Coupon discount — same math as before, but computed in memory.
    let discount = itemDiscount;
    if (couponId) {
      const coupon = couponMap.get(couponId);
      if (coupon) {
        if (coupon.discountPercent > 0) {
          let couponDiscount = Math.round(subtotal * (coupon.discountPercent / 100) * 100) / 100;
          if (coupon.maxDiscountAmount > 0) {
            couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
          }
          discount += couponDiscount;
        } else if (coupon.discountAmount > 0) {
          discount += coupon.discountAmount;
        }
      }
    }

    discount = Math.min(discount, subtotal);
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));

    order.subtotal = subtotal;
    order.taxAmount = taxAmount;
    order.discountAmount = parseFloat(discount.toFixed(2));
    order.totalAmount = parseFloat((subtotal + taxAmount + shippingAmount - discount).toFixed(2));

    orderData.push(order);
  }

  await createManyChunked(ctx.prisma.order, orderData);
  await createManyChunked(ctx.prisma.orderItem, itemData);

  counts.orders += orderData.length;
  counts.orderItems += itemData.length;

  return orderIds;
}
