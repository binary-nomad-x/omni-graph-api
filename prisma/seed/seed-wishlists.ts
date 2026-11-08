import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";
import { createManyChunked } from "./utils.js";

export async function seedWishlists(ctx: SeedContext, counts: SeedCounts, userIds: string[], productIds: string[]): Promise<void> {
  // Fetch products once — the previous version re-fetched inside every loop.
  const products = await ctx.prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true },
  });

  const wishlistData: {
    id: string;
    userId: string;
    name: string;
    description: string;
    isPublic: boolean;
    isDefault: boolean;
    itemCount: number;
    shareCode: string | null;
  }[] = [];
  const itemData: {
    wishlistId: string;
    productId: string;
    quantity: number;
    priority: string;
    priceAtAddition: number;
    note: string | null;
  }[] = [];

  for (const userId of userIds) {
    const wishlistCount = faker.number.int({ min: 1, max: 3 });
    for (let w = 0; w < wishlistCount; w++) {
      const wishlistId = crypto.randomUUID();
      const itemCount = faker.number.int({ min: 2, max: 6 });
      const usedProducts = new Set<string>();

      for (let i = 0; i < itemCount; i++) {
        const product = faker.helpers.arrayElement(products);
        if (usedProducts.has(product.id)) continue;
        usedProducts.add(product.id);

        itemData.push({
          wishlistId,
          productId: product.id,
          quantity: faker.number.int({ min: 1, max: 3 }),
          priority: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
          priceAtAddition: product.price,
          note: Math.random() > 0.5 ? faker.lorem.sentence() : null,
        });
      }

      // itemCount computed in memory — no per-wishlist update pass needed.
      wishlistData.push({
        id: wishlistId,
        userId,
        name: w === 0 ? "Default" : faker.lorem.words(2),
        description: faker.lorem.sentence(),
        isPublic: w === 0 ? false : faker.datatype.boolean({ probability: 0.3 }),
        isDefault: w === 0,
        itemCount: usedProducts.size,
        shareCode: w === 0 ? null : crypto.randomUUID().slice(0, 8),
      });
    }
  }

  await ctx.prisma.wishlist.createMany({ data: wishlistData });
  await createManyChunked(ctx.prisma.wishlistItem, itemData, 500, true);

  counts.wishlists += wishlistData.length;
  counts.wishlistItems += itemData.length;
}
