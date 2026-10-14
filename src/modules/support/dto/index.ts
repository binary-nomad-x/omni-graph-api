export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: string;
  category?: string;
}

export interface TicketFilterInput {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface AddTicketReplyInput {
  ticketId: string;
  content: string;
}
