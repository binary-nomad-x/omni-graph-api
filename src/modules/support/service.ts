import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateTicketInput, TicketFilterInput, AddTicketReplyInput } from "@gql-prisma-api/modules/support/dto/index.js";
import { triggerNovuWorkflow } from "@gql-prisma-api/utils/novu.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

export class SupportService {
  constructor(private readonly core: PrismaClient) {}
  async findMyTickets(userId: string, filter?: TicketFilterInput) {
    const conditions: Prisma.SupportTicketWhereInput[] = [{ userId }];

    if (filter?.status) {
      conditions.push({ status: filter.status });
    }

    const where: Prisma.SupportTicketWhereInput = { AND: conditions };

    return this.core.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: filter?.limit ?? 20,
      skip: filter?.offset ?? 0,
      include: {
        replies: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    });
  }

  async findTicketById(userId: string, id: string) {
    const ticket = await this.core.supportTicket.findUnique({
      where: { id },
      include: {
        replies: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  async createTicket(userId: string, input: CreateTicketInput) {
    const ticket = await this.core.supportTicket.create({
      data: {
        userId,
        subject: input.subject,
        description: input.description,
        priority: input.priority ?? "MEDIUM",
        category: input.category ?? "general",
      },
      include: { replies: true },
    });

    await this.core.notification.create({
      data: {
        userId,
        type: "TICKET_CREATED",
        title: "Support Ticket Created",
        message: `Ticket "${input.subject}" has been created.`,
      },
    });

    await triggerNovuWorkflow(userId!, "ticket-created", {
      ticketId: ticket.id,
      subject: input.subject,
    });
    logger.info("Support ticket created", { ticketId: ticket.id, userId });
    return ticket;
  }

  async addTicketReply(userId: string, input: AddTicketReplyInput) {
    const ticket = await this.core.supportTicket.findUnique({
      where: { id: input.ticketId },
    });
    if (!ticket) throw new Error("Ticket not found");

    const user = await this.core.user.findUnique({ where: { id: userId } });
    const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR";

    const reply = await this.core.ticketReply.create({
      data: {
        ticketId: input.ticketId,
        userId,
        content: input.content,
        isStaff,
      },
      include: { ticket: true, user: true },
    });

    await this.core.supportTicket.update({
      where: { id: input.ticketId },
      data: { status: "IN_PROGRESS" },
    });

    await triggerNovuWorkflow(userId!, "ticket-updated", {
      ticketId: input.ticketId,
      replyId: reply.id,
    });
    logger.info("Ticket reply added", { ticketId: input.ticketId, userId });
    return reply;
  }

  async resolveTicket(userId: string, id: string) {
    const ticket = await this.core.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error("Ticket not found");

    const updated = await this.core.supportTicket.update({
      where: { id },
      data: { status: "RESOLVED" },
      include: { replies: { include: { user: true } } },
    });

    await triggerNovuWorkflow(userId!, "ticket-resolved", { ticketId: id });
    logger.info("Ticket resolved", { ticketId: id, userId });
    return updated;
  }

  async closeTicket(userId: string, id: string) {
    const ticket = await this.core.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error("Ticket not found");

    const updated = await this.core.supportTicket.update({
      where: { id },
      data: { status: "CLOSED" },
      include: { replies: { include: { user: true } } },
    });

    logger.info("Ticket closed", { ticketId: id, userId });
    return updated;
  }
}
