export interface CreateReturnInput {
  orderItemId: string;
  reason: string;
  quantity: number;
}

export interface ReturnFilterInput {
  status?: string;
  limit?: number;
  offset?: number;
}
