export interface CreateShipmentInput {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: string | null;
}
