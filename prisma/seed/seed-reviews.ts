import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, ReviewSeed } from "./types.js";

export async function seedReviews(ctx: SeedContext, counts: SeedCounts, userIds: string[], productIds: string[]): Promise<void> {
  const seen = new Set<string>();

  const data: ReviewSeed[] = [];

  for (const productId of productIds) {
    const n = Math.floor(Math.random() * 10) + 2;

    for (let i = 0; i < n; i++) {
      const userId = faker.helpers.arrayElement(userIds);
      const key = `${userId}:${productId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const rating = faker.number.int({ min: 1, max: 5 });
      const hasImages = Math.random() > 0.6;

      data.push({
        rating,
        title: rating >= 3 ? faker.lorem.sentence({ min: 3, max: 8 }) : "Disappointed with purchase",
        content: faker.lorem.sentences({ min: 2, max: 6 }),
        isVerified: faker.datatype.boolean({ probability: 0.8 }),
        isRecommended: rating >= 3,
        helpfulCount: faker.number.int({ min: 0, max: 100 }),
        unhelpfulCount: faker.number.int({ min: 0, max: 20 }),
        pros: rating >= 3 ? Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => faker.lorem.words(3)) : null,
        cons: rating <= 3 ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.lorem.words(3)) : null,
        images: hasImages ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.image.url()) : null,
        responseFromSeller: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        responseDate: Math.random() > 0.7 ? faker.date.recent({ days: 30 }) : null,
        productId,
        userId,
      });
    }
  }

  await ctx.prisma.review.createMany({ data, skipDuplicates: true });
  counts.reviews += data.length;
}
