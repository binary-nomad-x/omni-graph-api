import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, MessageSeed } from "./types.js";

export async function seedConversations(ctx: SeedContext, counts: SeedCounts, userIds: string[]): Promise<void> {
  const conversationCount = Math.floor(userIds.length * 0.6);
  const usedPairs = new Set<string>();

  for (let i = 0; i < conversationCount; i++) {
    let userA: string;
    let userB: string;
    let pairKey: string;

    do {
      userA = faker.helpers.arrayElement(userIds);
      userB = faker.helpers.arrayElement(userIds);
      pairKey = [userA, userB].sort().join(":");
    } while (userA === userB || usedPairs.has(pairKey));

    usedPairs.add(pairKey);

    const conversation = await ctx.prisma.conversation.create({
      data: {
        title: faker.lorem.words(3),
        type: "direct",
        isArchived: Math.random() > 0.92,
        isMuted: Math.random() > 0.85,
        participantCount: 2,
        metadata: {
          initiatedBy: userA,
          topic: faker.lorem.word(),
        },
      },
    });

    counts.conversations++;

    await ctx.prisma.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          userId: userA,
          nickname: Math.random() > 0.6 ? faker.internet.username() : null,
          role: faker.helpers.arrayElement(["member", "member", "member", "admin", "moderator"]),
          isMuted: Math.random() > 0.9,
          notificationsEnabled: faker.datatype.boolean({ probability: 0.85 }),
          lastReadAt: faker.date.past(),
          pinnedAt: Math.random() > 0.85 ? faker.date.past() : null,
        },
        {
          conversationId: conversation.id,
          userId: userB,
          nickname: Math.random() > 0.6 ? faker.internet.username() : null,
          role: faker.helpers.arrayElement(["member", "member", "member", "admin"]),
          isMuted: Math.random() > 0.9,
          notificationsEnabled: faker.datatype.boolean({ probability: 0.85 }),
          lastReadAt: faker.date.past(),
          pinnedAt: Math.random() > 0.85 ? faker.date.past() : null,
        },
      ],
    });

    counts.participants += 2;

    const messageCount = faker.number.int({ min: 5, max: 15 });
    const messages: MessageSeed[] = [];

    for (let m = 0; m < messageCount; m++) {
      const sender = m % 2 === 0 ? userA : userB;
      const isRead = m < messageCount - 1;
      const messageType = faker.helpers.arrayElement(["text", "text", "text", "image", "attachment"]);
      const attachments =
        messageType === "image" || messageType === "attachment"
          ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
              url: faker.image.url(),
              name: faker.system.fileName(),
            }))
          : [];
      const reactions =
        Math.random() > 0.6
          ? {
              [faker.helpers.arrayElement(["thumbs_up", "heart", "laugh", "wow"])]: faker.helpers.arrayElements([userA, userB], {
                min: 1,
                max: 2,
              }),
            }
          : {};

      messages.push({
        conversationId: conversation.id,
        senderId: sender,
        content: faker.lorem.sentences({ min: 1, max: 4 }),
        type: messageType,
        isRead,
        readAt: isRead ? faker.date.past() : null,
        deliveredAt: faker.date.past(),
        attachments,
        reactions,
        parentId: null,
      });
    }

    await ctx.prisma.message.createMany({ data: messages });
    counts.messages += messages.length;

    // Update last message info
    const lastMsg = messages[messages.length - 1];
    await ctx.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageContent: lastMsg.content,
        lastMessageSenderId: lastMsg.senderId,
      },
    });
  }
}
