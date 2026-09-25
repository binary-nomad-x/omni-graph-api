import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, CartItemSeed } from "./types.js";

export async function seedCarts(ctx: SeedContext, counts: SeedCounts, userIds: string[], productIds: string[]): Promise<void> {
  const products = await ctx.prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true },
  });

  for (const userId of userIds) {
    const cart = await ctx.prisma.cart.create({
      data: {
        userId,
        notes: faker.lorem.text(),
        subtotal: 0,
        total: 0,
        currency: "USD",
        couponCode: faker.datatype.boolean({ probability: 0.2 }) ? faker.string.alphanumeric({ length: 10, casing: "upper" }) : null,
        discountAmount: 0,
        sessionId: faker.string.alphanumeric(24),
        expiresAt: faker.date.future({ years: 1 }),
      },
    });
    counts.carts++;

    const itemCount = faker.number.int({ min: 1, max: 5 });
    const items: CartItemSeed[] = [];
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
        cartId: cart.id,
        productId: product.id,
        quantity,
        unitPrice: product.price,
        discountAmount,
        totalPrice,
        notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        isSavedForLater: Math.random() > 0.9,
      });
    }

    if (items.length > 0) {
      await ctx.prisma.cartItem.createMany({
        data: items,
        skipDuplicates: true,
      });

      counts.cartItems += items.length;

      await ctx.prisma.cart.update({
        where: { id: cart.id },
        data: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          discountAmount: parseFloat(totalDiscount.toFixed(2)),
          total: parseFloat((subtotal - totalDiscount).toFixed(2)),
        },
      });
    }
  }
}
