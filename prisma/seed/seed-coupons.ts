import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";
import { COUPON_DATA } from "../data/coupons.js";

export async function seedCoupons(ctx: SeedContext, counts: SeedCounts, userIds: string[]): Promise<string[]> {
  const coupons = await Promise.all(
    COUPON_DATA.map((data) =>
      ctx.prisma.coupon.create({
        data: {
          ...data,
          isActive: true,
          usedCount: data.maxUses > 0 ? faker.number.int({ min: 0, max: data.maxUses }) : 0,
          createdById: faker.helpers.arrayElement(userIds),
          startedAt: faker.date.past(),
          expiresAt: faker.date.future({ years: 2 }),
        },
      }),
    ),
  );

  counts.coupons += coupons.length;
  return coupons.map((c) => c.id);
}
