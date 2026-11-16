import type { PrismaClient } from "@prisma/client";
import { logger } from "../../src/utils/logger.js";

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  logger.info("Resetting database...");
  await prisma.$transaction([
    prisma.novuVariable.deleteMany(),
    prisma.novuVariableGroup.deleteMany(),
    prisma.novuWorkflow.deleteMany(),
    prisma.ticketReply.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.returnRequest.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.discount.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.postView.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.savedPost.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.wishlist.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.review.deleteMany(),
    prisma.product.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.address.deleteMany(),
    prisma.like.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.post.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export function printElapsed(start: number): void {
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info(`Seeding complete in ${elapsed}s`);
}

/**
 * Bulk-insert in chunks. Postgres has a 65,535 bind-parameter limit per
 * statement, so very large createMany batches (many rows × many columns) can
 * fail with "too many parameters". Chunking keeps each statement well under it.
 */
export async function createManyChunked<T>(
  delegate: { createMany(args: { data: T[]; skipDuplicates?: boolean }): Promise<{ count: number }> },
  data: T[],
  chunkSize = 500,
  skipDuplicates = false,
): Promise<number> {
  if (data.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < data.length; i += chunkSize) {
    const result = await delegate.createMany({ data: data.slice(i, i + chunkSize), skipDuplicates });
    inserted += result.count;
  }
  return inserted;
}
