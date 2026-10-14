export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  items: OrderItemInput[];
  shippingAddress?: string | null;
  couponCode?: string | null;
}

export interface OrderFilterInput {
  status?: string;
  limit?: number;
  offset?: number;
}
