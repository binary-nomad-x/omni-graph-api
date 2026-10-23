export function resolveSupportTicketUser(parent: Record<string, unknown>) {
  return parent.user;
}

export function resolveSupportTicketReplies(parent: Record<string, unknown>) {
  return parent.replies;
}

export function resolveTicketReplyTicket(parent: Record<string, unknown>) {
  return parent.ticket;
}

export function resolveTicketReplyUser(parent: Record<string, unknown>) {
  return parent.user;
}


