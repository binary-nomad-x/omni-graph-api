export interface CreateProductInput {
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  sku: string;
  imageUrl?: string | null;
  categorySlug?: string | null;
}

export interface UpdateProductInput {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  stock?: number | null;
  imageUrl?: string | null;
  isActive?: boolean | null;
  categorySlug?: string | null;
}

export interface ProductFilterInput {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}
