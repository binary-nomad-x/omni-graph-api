export interface CreateRefundInput {
  paymentId: string;
  orderId: string;
  amount: number;
  reason?: string | null;
}

export interface RefundFilterInput {
  status?: string;
  limit?: number;
  offset?: number;
}
