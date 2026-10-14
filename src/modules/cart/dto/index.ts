export interface AddToCartInput {
  productId: string;
  quantity?: number | null;
}

export interface UpdateCartItemInput {
  productId: string;
  quantity: number;
}
