export interface CreateDiscountInput {
  productId: string;
  name: string;
  type: string;
  value: number;
  startDate: string;
  endDate: string;
  maxUsage?: number | null;
}

export interface UpdateDiscountInput {
  name?: string | null;
  value?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  maxUsage?: number | null;
}
