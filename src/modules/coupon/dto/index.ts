export interface CreateCouponInput {
  code: string;
  description?: string | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  minPurchase?: number | null;
  maxUses?: number | null;
  isActive?: boolean | null;
  expiresAt?: string | null;
}
