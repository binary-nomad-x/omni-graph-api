import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";
import type { SeedContext, SeedCounts, CommentSeed } from "./types.js";
import { createManyChunked } from "./utils.js";

export async function seedComments(ctx: SeedContext, counts: SeedCounts, userIds: string[], postIds: string[]): Promise<void> {
  const data: CommentSeed[] = [];

  for (const postId of postIds) {
    const commentCount = faker.number.int({ min: 5, max: 15 });
    for (let j = 0; j < commentCount; j++) {
      const authorId = faker.helpers.arrayElement(userIds);
      const isEdited = Math.random() > 0.8;
      data.push({
        content: faker.lorem.sentences({ min: 1, max: 4 }),
        isEdited,
        isApproved: Math.random() > 0.05,
        upvotes: faker.number.int({ min: 0, max: 50 }),
        downvotes: faker.number.int({ min: 0, max: 10 }),
        authorId,
        postId,
        parentId: null,
        editedAt: isEdited ? faker.date.recent({ days: 30 }) : null,
      });
    }
  }

  await createManyChunked(ctx.prisma.comment, data);
  const created = await ctx.prisma.comment.findMany({
    where: { postId: { in: postIds } },
    select: { id: true, postId: true },
  });
  counts.comments += created.length;

  // Add some nested replies (threaded comments)
  const replyData: CommentSeed[] = [];
  const commentPool = created.filter(() => Math.random() > 0.5);

  for (const comment of commentPool) {
    const replyCount = faker.number.int({ min: 1, max: 3 });
    for (let r = 0; r < replyCount; r++) {
      const isEdited = Math.random() > 0.85;
      replyData.push({
        content: faker.lorem.sentences({ min: 1, max: 3 }),
        isEdited,
        isApproved: Math.random() > 0.05,
        upvotes: faker.number.int({ min: 0, max: 20 }),
        downvotes: faker.number.int({ min: 0, max: 10 }),
        authorId: faker.helpers.arrayElement(userIds),
        postId: comment.postId,
        parentId: comment.id,
        editedAt: isEdited ? faker.date.recent({ days: 30 }) : null,
      });
    }
  }

  if (replyData.length > 0) {
    await createManyChunked(ctx.prisma.comment, replyData);
    counts.comments += replyData.length;
  }

  // Keep post.commentCount accurate — one statement instead of one UPDATE per post.
  await ctx.prisma.$executeRaw`
    UPDATE posts SET "commentCount" = counts.cnt
    FROM (
      SELECT "postId", COUNT(*)::int AS cnt
      FROM comments
      WHERE "postId" IN (${Prisma.join(postIds)})
      GROUP BY "postId"
    ) AS counts
    WHERE posts.id = counts."postId";
  `;
}
