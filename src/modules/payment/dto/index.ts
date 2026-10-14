export interface ProcessPaymentInput {
  orderId: string;
  method: string;
}

export interface PaymentFilterInput {
  status?: string;
  limit?: number;
  offset?: number;
}
