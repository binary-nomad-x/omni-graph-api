import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, CommentSeed } from "./types.js";

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

  await ctx.prisma.comment.createMany({ data });
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
    await ctx.prisma.comment.createMany({ data: replyData });
    counts.comments += replyData.length;
  }
}
