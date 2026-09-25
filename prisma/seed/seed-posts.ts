import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";

export async function seedPosts(
  ctx: SeedContext,
  counts: SeedCounts,
  userIds: string[],
  tagIds: string[],
  categoryIds: string[],
  count: number,
): Promise<string[]> {
  const postIds = Array.from({ length: count }, () => crypto.randomUUID());

  for (let i = 0; i < count; i++) {
    const id = postIds[i];
    const published = Math.random() > 0.15;
    const title = faker.lorem.sentence({ min: 4, max: 10 }).slice(0, 100);
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${crypto.randomUUID().slice(0, 6)}`;

    await ctx.prisma.post.create({
      data: {
        id,
        title,
        slug,
        content: faker.lorem.paragraphs({ min: 3, max: 8 }),
        excerpt: faker.lorem.sentences({ min: 1, max: 2 }),
        coverImage: faker.image.url(),
        readingTime: faker.number.int({ min: 2, max: 15 }),
        published,
        isFeatured: Math.random() > 0.85,
        isArchived: Math.random() > 0.97,
        metaTitle: title,
        metaDescription: faker.lorem.sentence(),
        allowComments: faker.datatype.boolean({ probability: 0.9 }),
        viewCount: faker.number.int({ min: 0, max: 5000 }),
        likeCount: faker.number.int({ min: 0, max: 200 }),
        commentCount: 0,
        authorId: faker.helpers.arrayElement(userIds),
        tags: {
          connect: faker.helpers.arrayElements(tagIds, { min: 1, max: 5 }).map((id) => ({ id })),
        },
        categories: {
          connect: faker.helpers.arrayElements(categoryIds, { min: 1, max: 3 }).map((id) => ({ id })),
        },
      },
    });
  }

  counts.posts += count;
  return postIds;
}
