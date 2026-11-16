import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, CartItemSeed } from "./types.js";
import { createManyChunked } from "./utils.js";

export async function seedCarts(ctx: SeedContext, counts: SeedCounts, userIds: string[], productIds: string[]): Promise<void> {
  const products = await ctx.prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true },
  });

  const cartIds = userIds.map(() => crypto.randomUUID());

  const cartData: {
    id: string;
    userId: string;
    notes: string | null;
    subtotal: number;
    total: number;
    currency: string;
    couponCode: string | null;
    discountAmount: number;
    sessionId: string;
    expiresAt: Date;
  }[] = [];
  const items: CartItemSeed[] = [];

  for (let u = 0; u < userIds.length; u++) {
    const cartId = cartIds[u];
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const used = new Set<string>();
    let subtotal = 0;
    let totalDiscount = 0;

    for (let i = 0; i < itemCount; i++) {
      const product = faker.helpers.arrayElement(products);
      if (used.has(product.id)) continue;
      used.add(product.id);

      const quantity = faker.number.int({ min: 1, max: 3 });
      const grossTotal = parseFloat((product.price * quantity).toFixed(2));
      const discountAmount =
        Math.random() > 0.4 ? parseFloat((grossTotal * faker.helpers.arrayElement([0.05, 0.1, 0.15, 0.2, 0.25])).toFixed(2)) : 0;
      const totalPrice = parseFloat((grossTotal - discountAmount).toFixed(2));

      subtotal += grossTotal;
      totalDiscount += discountAmount;

      items.push({
        cartId,
        productId: product.id,
        quantity,
        unitPrice: product.price,
        discountAmount,
        totalPrice,
        notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        isSavedForLater: Math.random() > 0.9,
      });
    }

    // Totals are computed up front — no per-cart update pass needed.
    cartData.push({
      id: cartId,
      userId: userIds[u],
      notes: faker.lorem.text(),
      subtotal: parseFloat(subtotal.toFixed(2)),
      total: parseFloat((subtotal - totalDiscount).toFixed(2)),
      currency: "USD",
      couponCode: faker.datatype.boolean({ probability: 0.2 }) ? faker.string.alphanumeric({ length: 10, casing: "upper" }) : null,
      discountAmount: parseFloat(totalDiscount.toFixed(2)),
      sessionId: faker.string.alphanumeric(24),
      expiresAt: faker.date.future({ years: 1 }),
    });
  }

  await ctx.prisma.cart.createMany({ data: cartData });
  await createManyChunked(ctx.prisma.cartItem, items, 500, true);

  counts.carts += cartData.length;
  counts.cartItems += items.length;
}
