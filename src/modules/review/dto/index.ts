export interface CreateReviewInput {
  rating: number;
  title?: string | null;
  content?: string | null;
  productId: string;
}
