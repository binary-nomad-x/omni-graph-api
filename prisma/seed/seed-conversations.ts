import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts, MessageSeed } from "./types.js";
import { createManyChunked } from "./utils.js";

export async function seedConversations(ctx: SeedContext, counts: SeedCounts, userIds: string[]): Promise<void> {
  const conversationCount = Math.floor(userIds.length * 0.6);
  const usedPairs = new Set<string>();

  const conversationData: {
    id: string;
    title: string;
    type: string;
    isArchived: boolean;
    isMuted: boolean;
    participantCount: number;
    lastMessageAt: Date;
    lastMessageContent: string;
    lastMessageSenderId: string;
    metadata: object;
  }[] = [];
  const participantData: {
    conversationId: string;
    userId: string;
    nickname: string | null;
    role: string;
    isMuted: boolean;
    notificationsEnabled: boolean;
    lastReadAt: Date;
    pinnedAt: Date | null;
  }[] = [];
  const messageData: MessageSeed[] = [];

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

    const conversationId = crypto.randomUUID();
    const messageCount = faker.number.int({ min: 5, max: 15 });

    for (let m = 0; m < messageCount; m++) {
      const sender = m % 2 === 0 ? userA : userB;
      const isRead = m < messageCount - 1;
      const isEdited = Math.random() > 0.85;
      const messageType = faker.helpers.arrayElement(["text", "text", "text", "image", "attachment"]);
      const attachments =
        messageType === "image" || messageType === "attachment"
          ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
              url: faker.image.url(),
              name: faker.system.fileName(),
              size: faker.number.int({ min: 1024, max: 5000000 }),
            }))
          : null;
      const reactions =
        Math.random() > 0.5
          ? {
              [faker.helpers.arrayElement(["thumbs_up", "heart", "laugh", "wow", "sad"])]: faker.helpers.arrayElements([userA, userB], {
                min: 1,
                max: 2,
              }),
            }
          : null;

      messageData.push({
        conversationId,
        senderId: sender,
        content: faker.lorem.sentences({ min: 1, max: 4 }),
        type: messageType,
        isRead,
        readAt: isRead ? faker.date.past() : null,
        deliveredAt: faker.date.past(),
        editedAt: isEdited ? faker.date.recent({ days: 14 }) : null,
        attachments,
        reactions,
        parentId: null,
      });
    }

    const lastMsg = messageData[messageData.length - 1];

    conversationData.push({
      id: conversationId,
      title: faker.lorem.words(3),
      type: "direct",
      isArchived: Math.random() > 0.92,
      isMuted: Math.random() > 0.85,
      participantCount: 2,
      lastMessageAt: new Date(),
      lastMessageContent: lastMsg.content,
      lastMessageSenderId: lastMsg.senderId,
      metadata: {
        initiatedBy: userA,
        topic: faker.lorem.word(),
      },
    });

    participantData.push(
      {
        conversationId,
        userId: userA,
        nickname: Math.random() > 0.6 ? faker.internet.username() : null,
        role: faker.helpers.arrayElement(["member", "member", "member", "admin", "moderator"]),
        isMuted: Math.random() > 0.9,
        notificationsEnabled: faker.datatype.boolean({ probability: 0.85 }),
        lastReadAt: faker.date.past(),
        pinnedAt: Math.random() > 0.85 ? faker.date.past() : null,
      },
      {
        conversationId,
        userId: userB,
        nickname: Math.random() > 0.6 ? faker.internet.username() : null,
        role: faker.helpers.arrayElement(["member", "member", "member", "admin"]),
        isMuted: Math.random() > 0.9,
        notificationsEnabled: faker.datatype.boolean({ probability: 0.85 }),
        lastReadAt: faker.date.past(),
        pinnedAt: Math.random() > 0.85 ? faker.date.past() : null,
      },
    );
  }

  await ctx.prisma.conversation.createMany({ data: conversationData });
  await createManyChunked(ctx.prisma.conversationParticipant, participantData, 500, true);
  await createManyChunked(ctx.prisma.message, messageData);

  counts.conversations += conversationData.length;
  counts.participants += participantData.length;
  counts.messages += messageData.length;
}
