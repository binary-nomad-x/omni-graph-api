import DataLoader from "dataloader";
import type { PrismaClient, User, OrderItem, Review, ProductImage, Comment, Like, Category, Product, Post } from "@prisma/client";
import type { Context } from "@gql-prisma-api/types/context.js";

/**
 * DataLoader factories — N+1 killers for hot GraphQL fields.
 * Each request gets its own loaders via createLoaders(prisma) in the context,
 * so batches don't leak across requests.
 */
export interface Loaders {
  postAuthor: DataLoader<string, User | null>;
  commentAuthor: DataLoader<string, User | null>;
  user: DataLoader<string, User | null>;
  category: DataLoader<string, Category | null>;
  product: DataLoader<string, Product | null>;
  post: DataLoader<string, Post | null>;
  orderItems: DataLoader<string, OrderItem[]>;
  productReviews: DataLoader<string, Review[]>;
  productImages: DataLoader<string, ProductImage[]>;
  postComments: DataLoader<string, Comment[]>;
  postLikes: DataLoader<string, Like[]>;
}

function makeUniqueLoader<T extends { id: string }>(
  prisma: PrismaClient,
  model: "user" | "category" | "product" | "post",
): DataLoader<string, T | null> {
  return new DataLoader<string, T | null>(async (ids: readonly string[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model] as { findMany: (args: { where: { id: { in: string[] } } }) => Promise<T[]> };
    const rows = await delegate.findMany({ where: { id: { in: [...ids] } } });
    const map = new Map<string, T>(rows.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

function makeHasManyLoader<T extends Record<string, unknown>>(
  prisma: PrismaClient,
  model: "orderItem" | "review" | "productImage" | "comment" | "like",
  fk: string,
): DataLoader<string, T[]> {
  return new DataLoader<string, T[]>(async (keys: readonly string[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model] as { findMany: (args: { where: Record<string, { in: string[] }> }) => Promise<T[]> };
    const rows = await delegate.findMany({ where: { [fk]: { in: [...keys] } } });
    const grouped = new Map<string, T[]>();
    for (const row of rows) {
      const key = String(row[fk]);
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }
    return keys.map((key) => grouped.get(key) ?? []);
  });
}

export function createLoaders(prisma: PrismaClient): Loaders {
  return {
    postAuthor: makeUniqueLoader<User>(prisma, "user"),
    commentAuthor: makeUniqueLoader<User>(prisma, "user"),
    user: makeUniqueLoader<User>(prisma, "user"),
    category: makeUniqueLoader<Category>(prisma, "category"),
    product: makeUniqueLoader<Product>(prisma, "product"),
    post: makeUniqueLoader<Post>(prisma, "post"),
    orderItems: makeHasManyLoader<OrderItem>(prisma, "orderItem", "orderId"),
    productReviews: makeHasManyLoader<Review>(prisma, "review", "productId"),
    productImages: makeHasManyLoader<ProductImage>(prisma, "productImage", "productId"),
    postComments: makeHasManyLoader<Comment>(prisma, "comment", "postId"),
    postLikes: makeHasManyLoader<Like>(prisma, "like", "postId"),
  };
}

export type LoadersContext = Context & { loaders?: Loaders };
