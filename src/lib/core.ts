import type { Prisma } from "@prisma/client";
import type { CreateDiscountInput, UpdateDiscountInput } from "@gql-prisma-api/modules/discount/dto/index.js";

export function clean<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === null) {
      delete result[key];
    }
  }
  return result;
}

export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return clean(obj);
}

// --- Prisma enum types ---

export type OrderStatusEnum = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type RefundStatusEnum = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
export type PaymentMethodEnum = "CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "CASH_ON_DELIVERY";
export type ShipmentStatusEnum = "PENDING" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";

// --- Discount input transformers ---

export function toDiscountCreate(input: CreateDiscountInput): Prisma.DiscountUncheckedCreateInput {
  return {
    productId: input.productId,
    name: input.name,
    type: input.type,
    value: input.value,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    maxUsage: input.maxUsage ?? 0,
  };
}

export function toDiscountUpdate(input: UpdateDiscountInput): Prisma.DiscountUpdateInput {
  const data: Prisma.DiscountUpdateInput = {};
  if (input.name !== undefined && input.name !== null) data.name = input.name;
  if (input.value !== undefined && input.value !== null) data.value = input.value;
  if (input.startDate !== undefined && input.startDate !== null) data.startDate = new Date(input.startDate);
  if (input.endDate !== undefined && input.endDate !== null) data.endDate = new Date(input.endDate);
  if (input.isActive !== undefined && input.isActive !== null) data.isActive = input.isActive;
  if (input.maxUsage !== undefined && input.maxUsage !== null) data.maxUsage = input.maxUsage;
  return data;
}



