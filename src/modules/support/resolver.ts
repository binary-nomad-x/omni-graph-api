import type { Context } from "@gql-prisma-api/types/context.js";
import type { CreateTicketInput, TicketFilterInput, AddTicketReplyInput } from "@gql-prisma-api/modules/support/dto/index.js";
import {
  resolveSupportTicketUser,
  resolveSupportTicketReplies,
  resolveTicketReplyTicket,
  resolveTicketReplyUser,
} from "@gql-prisma-api/helpers/resolve.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const SupportTicket = {
  user: (parent: Record<string, unknown>, _args: unknown, _ctx: Context) => resolveSupportTicketUser(parent),
  replies: (parent: Record<string, unknown>, _args: unknown, _ctx: Context) => resolveSupportTicketReplies(parent),
};

export const TicketReply = {
  ticket: (parent: Record<string, unknown>, _args: unknown, _ctx: Context) => resolveTicketReplyTicket(parent),
  user: (parent: Record<string, unknown>, _args: unknown, _ctx: Context) => resolveTicketReplyUser(parent),
};

export const Query = {
  myTickets: (_: unknown, args: TicketFilterInput, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.support.findMyTickets(ctx.userId, args);
  },
  ticket: (_: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.support.findTicketById(ctx.userId, args.id);
  },
  ticketReplies: async (_: unknown, args: { ticketId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    const ticket = await ctx.services.support.findTicketById(ctx.userId, args.ticketId);
    return ticket.replies;
  },
};

export const Mutation = {
  createTicket: (_: unknown, args: { input: CreateTicketInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.support.createTicket(ctx.userId, args.input);
  },
  addTicketReply: (_: unknown, args: { input: AddTicketReplyInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.support.addTicketReply(ctx.userId, args.input);
  },
  resolveTicket: (_: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.support.resolveTicket(ctx.userId, args.id);
  },
  closeTicket: (_: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.support.closeTicket(ctx.userId, args.id);
  },
};
