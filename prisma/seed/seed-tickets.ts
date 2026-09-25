import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, TicketReplySeed } from "./types.js";

const CATEGORIES = ["general", "billing", "technical", "account", "shipping", "returns"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const LANGUAGES = ["en", "es", "fr", "de", "ja"];

export async function seedTickets(ctx: SeedContext, counts: SeedCounts, userIds: string[]): Promise<void> {
  const ticketCount = Math.floor(userIds.length * 0.7);

  for (let i = 0; i < ticketCount; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const assignedToId = faker.helpers.arrayElement(userIds);
    const status = faker.helpers.arrayElement(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
    const isResolved = status === "RESOLVED";
    const isClosed = status === "CLOSED";

    const ticket = await ctx.prisma.supportTicket.create({
      data: {
        userId,
        subject: faker.lorem.sentence({ min: 5, max: 10 }),
        description: faker.lorem.paragraphs({ min: 2, max: 4 }),
        status,
        priority: faker.helpers.arrayElement(PRIORITIES),
        category: faker.helpers.arrayElement(CATEGORIES),
        language: faker.helpers.arrayElement(LANGUAGES),
        assignedToId,
        resolution: isResolved ? faker.lorem.paragraph() : null,
        escalationReason: !isResolved && !isClosed && Math.random() > 0.8 ? faker.lorem.sentence() : null,
        satisfactionRating: isResolved ? faker.number.int({ min: 1, max: 5 }) : null,
        feedback: isResolved ? faker.lorem.sentence() : null,
        tags: faker.helpers.arrayElements(["urgent", "recurring", "high-value", "vip", "follow-up", "escalated"], { min: 0, max: 3 }),
        resolvedAt: isResolved ? faker.date.past() : null,
        closedAt: isClosed ? faker.date.past() : null,
      },
    });

    counts.tickets++;

    const replyCount = faker.number.int({ min: 2, max: 5 });
    const replies: TicketReplySeed[] = [];

    for (let r = 0; r < replyCount; r++) {
      const isStaffReply = r > 0 && Math.random() > 0.4;
      const isSolution = isStaffReply && r === replyCount - 1 && isResolved;

      replies.push({
        ticketId: ticket.id,
        userId: isStaffReply ? assignedToId : userId,
        content: faker.lorem.paragraphs({ min: 1, max: 2 }),
        isStaff: isStaffReply,
        isInternal: isStaffReply && Math.random() > 0.8,
        isSolution,
        attachments:
          Math.random() > 0.7
            ? Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => ({
                url: faker.image.url(),
                name: faker.lorem.word() + ".png",
                size: faker.number.int({ min: 10000, max: 500000 }),
              }))
            : [],
      });
    }

    await ctx.prisma.ticketReply.createMany({ data: replies });
    counts.ticketReplies += replies.length;
  }
}
