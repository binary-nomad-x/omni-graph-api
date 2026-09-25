import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";

const TYPES = ["info", "warning", "success", "error", "promotion", "reminder"] as const;
const CHANNELS = ["in-app", "email", "sms", "push"];
const CATEGORIES = ["general", "order", "promotion", "account", "system"];

export async function seedNotifications(ctx: SeedContext, counts: SeedCounts, userIds: string[]): Promise<void> {
  const data: {
    userId: string;
    senderId: string | null;
    type: string;
    title: string;
    message: string;
    link: string;
    actionUrl: string | null;
    imageUrl: string | null;
    channel: string;
    category: string;
    isRead: boolean;
    readAt: Date | null;
    seenAt: Date | null;
    deliveredAt: Date | null;
    expiresAt: Date | null;
    metadata: object;
  }[] = [];

  for (const userId of userIds) {
    const n = faker.number.int({ min: 5, max: 12 });
    for (let i = 0; i < n; i++) {
      const type = faker.helpers.arrayElement(TYPES);
      const isRead = Math.random() > 0.4;

      data.push({
        userId,
        senderId: type !== "system" && Math.random() > 0.5 ? faker.helpers.arrayElement(userIds) : null,
        type,
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        message: faker.lorem.sentences({ min: 1, max: 2 }),
        link: faker.internet.url(),
        actionUrl: Math.random() > 0.5 ? faker.internet.url() : null,
        imageUrl: Math.random() > 0.7 ? faker.image.url() : null,
        channel: faker.helpers.arrayElement(CHANNELS),
        category: faker.helpers.arrayElement(CATEGORIES),
        isRead,
        readAt: isRead ? faker.date.past() : null,
        seenAt: isRead ? faker.date.past() : null,
        deliveredAt: faker.date.past(),
        expiresAt: Math.random() > 0.8 ? faker.date.future() : null,
        metadata: {
          source: faker.helpers.arrayElement(["system", "admin", "automated"]),
          priority: faker.helpers.arrayElement(["low", "medium", "high"]),
        },
      });
    }
  }

  await ctx.prisma.notification.createMany({
    data: data.map((n) => ({
      ...n,
      actionUrl: n.actionUrl || null,
      imageUrl: n.imageUrl || null,
    })),
  });
  counts.notifications += data.length;
}
