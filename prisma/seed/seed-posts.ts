import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";
import type { SeedContext, SeedCounts } from "./types.js";
import { createManyChunked } from "./utils.js";

/**
 * Bulk-insert implicit many-to-many join rows (_PostToTag / _PostToCategory).
 * Column "A" holds the Post id in both tables (alphabetical model order);
 * "B" holds the Tag/Category id.
 */
async function insertJoinRows(
  ctx: SeedContext,
  table: "_PostToTag" | "_PostToCategory",
  pairs: Array<{ a: string; b: string }>,
): Promise<void> {
  if (pairs.length === 0) return;
  const values = Prisma.join(
    pairs.map((p) => Prisma.sql`(${p.a}::text, ${p.b}::text)`),
  );
  await ctx.prisma.$executeRaw`INSERT INTO ${Prisma.raw(`"${table}"`)} ("A", "B") VALUES ${values} ON CONFLICT DO NOTHING`;
}

export async function seedPosts(
  ctx: SeedContext,
  counts: SeedCounts,
  userIds: string[],
  tagIds: string[],
  categoryIds: string[],
  count: number,
): Promise<string[]> {
  const postIds = Array.from({ length: count }, () => crypto.randomUUID());

  const postData = postIds.map((id) => {
    const published = Math.random() > 0.15;
    const title = faker.lorem.sentence({ min: 4, max: 10 }).slice(0, 100);
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${crypto.randomUUID().slice(0, 6)}`;

    return {
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
    };
  });

  await createManyChunked(ctx.prisma.post, postData);

  // Many-to-many joins: dedupe pairs, then bulk-insert in a single statement.
  const tagPairs = new Set<string>();
  const categoryPairs = new Set<string>();
  for (const postId of postIds) {
    for (const tagId of faker.helpers.arrayElements(tagIds, { min: 1, max: 5 })) {
      tagPairs.add(`${postId}:${tagId}`);
    }
    for (const categoryId of faker.helpers.arrayElements(categoryIds, { min: 1, max: 3 })) {
      categoryPairs.add(`${postId}:${categoryId}`);
    }
  }

  await Promise.all([
    insertJoinRows(
      ctx,
      "_PostToTag",
      Array.from(tagPairs, (pair) => {
        const [a, b] = pair.split(":");
        return { a, b };
      }),
    ),
    insertJoinRows(
      ctx,
      "_PostToCategory",
      Array.from(categoryPairs, (pair) => {
        // Note: in _PostToCategory, "A" = categories.id and "B" = posts.id
        const [postId, categoryId] = pair.split(":");
        return { a: categoryId, b: postId };
      }),
    ),
  ]);

  counts.posts += count;
  return postIds;
}
