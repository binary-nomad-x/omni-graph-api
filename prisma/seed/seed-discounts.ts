import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, DiscountSeed } from "./types.js";

const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"];

export async function seedDiscounts(ctx: SeedContext, counts: SeedCounts, userIds: string[], productIds: string[]): Promise<void> {
  const data: DiscountSeed[] = [];

  for (const productId of productIds) {
    const hasDiscount = Math.random() > 0.5;
    if (!hasDiscount) continue;

    const type = faker.helpers.arrayElement(DISCOUNT_TYPES);
    const maxUsage = faker.number.int({ min: 10, max: 200 });
    const usedCount = faker.number.int({ min: 0, max: maxUsage });

    data.push({
      productId,
      name: faker.lorem.words({ min: 3, max: 6 }),
      code: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
      description: faker.lorem.sentence(),
      type,
      value:
        type === "PERCENTAGE" ? faker.helpers.arrayElement([10, 15, 20, 25, 30, 40, 50, 60]) : parseFloat(faker.commerce.price({ min: 5, max: 100 })),
      minQuantity: faker.number.int({ min: 0, max: 3 }),
      maxQuantity: faker.number.int({ min: 5, max: 50 }),
      minimumOrderAmount: parseFloat(faker.commerce.price({ min: 0, max: 100 })),
      usageLimitPerUser: faker.number.int({ min: 1, max: 5 }),
      startDate: faker.date.past(),
      endDate: faker.date.future(),
      isActive: Math.random() > 0.15,
      stackable: Math.random() > 0.7,
      priority: faker.number.int({ min: 0, max: 10 }),
      maxUsage,
      usedCount,
      createdById: faker.helpers.arrayElement(userIds),
      metadata: {
        createdBy: faker.helpers.arrayElement(userIds),
        campaign: faker.helpers.arrayElement(["summer", "winter", "spring", "fall", "clearance"]),
      },
    });
  }

  if (data.length > 0) {
    await ctx.prisma.discount.createMany({ data });
  }

  counts.discounts += data.length;
}
