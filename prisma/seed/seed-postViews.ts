import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, PostViewSeed } from "./types.js";
import { createManyChunked } from "./utils.js";

const DEVICES = ["desktop", "mobile", "tablet", "smart_tv"];
const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
const COUNTRIES = ["US", "GB", "CA", "DE", "FR", "AU", "IN", "JP"];
const CITIES = ["New York", "London", "Toronto", "Berlin", "Paris", "Sydney", "Mumbai", "Tokyo"];

export async function seedPostViews(ctx: SeedContext, counts: SeedCounts, postIds: string[], userIds: string[]): Promise<void> {
  const data: PostViewSeed[] = [];

  for (const postId of postIds) {
    const n = faker.number.int({ min: 10, max: 40 });
    for (let i = 0; i < n; i++) {
      const country = faker.helpers.arrayElement(COUNTRIES);
      data.push({
        postId,
        userId: faker.helpers.arrayElement(userIds),
        ip: faker.internet.ip(),
        referrer: faker.helpers.arrayElement([
          "https://google.com",
          "https://facebook.com",
          "https://twitter.com",
          "https://reddit.com",
          "https://linkedin.com",
          "https://bing.com",
          null,
        ]),
        userAgent: faker.internet.userAgent(),
        country,
        city: faker.helpers.arrayElement(CITIES),
        device: faker.helpers.arrayElement(DEVICES),
        browser: faker.helpers.arrayElement(BROWSERS),
        duration: faker.number.int({ min: 5, max: 600 }),
      });
    }
  }

  await createManyChunked(ctx.prisma.postView, data);
  counts.postViews += data.length;
}
