export interface CreateWishlistInput {
  name?: string | null;
}

export interface AddToWishlistInput {
  wishlistId: string;
  productId: string;
  note?: string | null;
}
