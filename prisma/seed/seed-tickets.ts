import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, TicketReplySeed } from "./types.js";

const CATEGORIES = ["general", "billing", "technical", "account", "shipping", "returns"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const LANGUAGES = ["en", "es", "fr", "de", "ja"];
const TAG_POOL = ["urgent", "recurring", "high-value", "vip", "follow-up", "escalated"];

export async function seedTickets(ctx: SeedContext, counts: SeedCounts, userIds: string[], orderIds: string[]): Promise<void> {
  const ticketCount = Math.floor(userIds.length * 0.7);
  const ticketIds: string[] = [];

  for (let i = 0; i < ticketCount; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const assignedToId = faker.helpers.arrayElement(userIds);
    const status = faker.helpers.arrayElement(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
    const isResolved = status === "RESOLVED";
    const isClosed = status === "CLOSED";
    const isEscalated = Math.random() > 0.75;

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
        escalatedToId: isEscalated ? faker.helpers.arrayElement(userIds.filter((id) => id !== assignedToId)) : null,
        relatedOrderId: Math.random() > 0.55 ? faker.helpers.arrayElement(orderIds) : null,
        relatedTicketId: ticketIds.length > 0 && Math.random() > 0.85 ? faker.helpers.arrayElement(ticketIds) : null,
        resolution: isResolved ? faker.lorem.paragraph() : null,
        escalationReason: isEscalated ? faker.lorem.sentence() : null,
        satisfactionRating: isResolved ? faker.number.int({ min: 1, max: 5 }) : null,
        feedback: isResolved ? faker.lorem.sentence() : null,
        tags: Math.random() > 0.1 ? faker.helpers.arrayElements(TAG_POOL, { min: 1, max: 3 }) : null,
        resolvedAt: isResolved ? faker.date.past() : null,
        closedAt: isClosed ? faker.date.past() : null,
      },
    });

    ticketIds.push(ticket.id);
    counts.tickets++;

    const replyCount = faker.number.int({ min: 2, max: 5 });
    const replies: TicketReplySeed[] = [];

    for (let r = 0; r < replyCount; r++) {
      const isStaffReply = r > 0 && Math.random() > 0.4;
      const isSolution = isStaffReply && r === replyCount - 1 && isResolved;
      const isEdited = Math.random() > 0.85;

      replies.push({
        ticketId: ticket.id,
        userId: isStaffReply ? assignedToId : userId,
        content: faker.lorem.paragraphs({ min: 1, max: 2 }),
        isStaff: isStaffReply,
        isInternal: isStaffReply && Math.random() > 0.8,
        isSolution,
        editedAt: isEdited ? faker.date.recent({ days: 14 }) : null,
        attachments:
          Math.random() > 0.7
            ? Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => ({
                url: faker.image.url(),
                name: faker.lorem.word() + ".png",
                size: faker.number.int({ min: 10000, max: 500000 }),
              }))
            : null,
      });
    }

    await ctx.prisma.ticketReply.createMany({ data: replies });
    counts.ticketReplies += replies.length;
  }
}
