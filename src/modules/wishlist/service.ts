import type { PrismaClient } from "@prisma/client";
import type { CreateWishlistInput, AddToWishlistInput } from "@gql-prisma-api/modules/wishlist/dto/index.js";

export class WishlistService {
  constructor(private readonly core: PrismaClient) {}

  // --- Type-field resolver functions ---
  resolveWishlistUser(userId: string) {
    return this.core.user.findUnique({ where: { id: userId } });
  }

  resolveWishlistItems(wishlistId: string) {
    return this.core.wishlistItem.findMany({
      where: { wishlistId },
      include: { product: true },
    });
  }

  resolveWishlistItemCount(wishlistId: string) {
    return this.core.wishlistItem.count({ where: { wishlistId } });
  }

  resolveWishlistItemWishlist(wishlistId: string) {
    return this.core.wishlist.findUnique({ where: { id: wishlistId } });
  }

  resolveWishlistItemProduct(productId: string) {
    return this.core.product.findUnique({ where: { id: productId } });
  }

  // --- Existing business logic functions ---
  async createWishlist(userId: string, input: CreateWishlistInput) {
    return this.core.wishlist.create({
      data: { name: input.name ?? "Default", userId },
    });
  }

  async addToWishlist(userId: string, input: AddToWishlistInput) {
    const wishlist = await this.core.wishlist.findFirst({
      where: { id: input.wishlistId, userId },
    });
    if (!wishlist) throw new Error("Wishlist not found");

    const product = await this.core.product.findUnique({
      where: { id: input.productId },
    });
    await this.core.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: input.wishlistId,
          productId: input.productId,
        },
      },
      update: { note: input.note ?? undefined },
      create: {
        wishlistId: input.wishlistId,
        productId: input.productId,
        note: input.note ?? undefined,
        priority: "MEDIUM",
        priceAtAddition: product?.price ?? 0,
      },
    });

    return this.core.wishlist.findUnique({ where: { id: input.wishlistId } });
  }

  async removeFromWishlist(userId: string, wishlistId: string, productId: string) {
    const item = await this.core.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId, productId } },
    });
    if (item) await this.core.wishlistItem.delete({ where: { id: item.id } });
    return this.core.wishlist.findUnique({ where: { id: wishlistId } });
  }

  async deleteWishlist(userId: string, id: string) {
    await this.core.wishlist.deleteMany({ where: { id, userId } });
    return true;
  }

  getMyWishlists(userId: string) {
    return this.core.wishlist.findMany({ where: { userId } });
  }

  async getWishlist(userId: string, id: string) {
    return this.core.wishlist.findFirst({ where: { id, userId } });
  }
}
