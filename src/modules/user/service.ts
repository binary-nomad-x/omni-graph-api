import type { Prisma, PrismaClient } from "@prisma/client";
import type { UpdateUserInput, UpdateProfileInput } from "@gql-prisma-api/modules/user/dto/index.js";
import { hashPassword } from "@gql-prisma-api/utils/auth.js";
import { requireOwner } from "@gql-prisma-api/utils/errors.js";
import { clean } from "@gql-prisma-api/lib/core.js";
import { emailQueue } from "@gql-prisma-api/lib/queues/email.js";

export class UserService {
  constructor(private readonly core: PrismaClient) {}

  resolveUserProfile(userId: string) {
    return this.core.profile.findUnique({ where: { userId } });
  }
  resolveUserPosts(userId: string) {
    return this.core.post.findMany({ where: { authorId: userId } });
  }
  resolveUserComments(userId: string) {
    return this.core.comment.findMany({ where: { authorId: userId } });
  }
  resolveUserLikes(userId: string) {
    return this.core.like.findMany({ where: { userId } });
  }
  resolveUserProducts(userId: string) {
    return this.core.product.findMany({ where: { sellerId: userId } });
  }
  resolveUserOrders(userId: string) {
    return this.core.order.findMany({ where: { userId } });
  }
  resolveUserReviews(userId: string) {
    return this.core.review.findMany({ where: { userId } });
  }
  resolveUserAddresses(userId: string) {
    return this.core.address.findMany({ where: { userId } });
  }
  resolveUserWishlists(userId: string) {
    return this.core.wishlist.findMany({ where: { userId } });
  }
  resolveUserCart(userId: string) {
    return this.core.cart.findUnique({ where: { userId } });
  }
  resolveUserNotifications(userId: string) {
    return this.core.notification.findMany({ where: { userId } });
  }
  resolveUserFollowers(userId: string) {
    return this.core.follow.findMany({ where: { followingId: userId } });
  }
  resolveUserFollowing(userId: string) {
    return this.core.follow.findMany({ where: { followerId: userId } });
  }
  resolveUserSavedPosts(userId: string) {
    return this.core.savedPost.findMany({ where: { userId } });
  }
  resolveUserPostViews(userId: string) {
    return this.core.postView.findMany({ where: { userId } });
  }

  async updateUser(userId: string, args: { id: string; input: UpdateUserInput }) {
    requireOwner(args.id, userId);
    const data: Prisma.UserUpdateInput = {};
    const { name, email, password } = args.input;
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await hashPassword(password);
    return this.core.user.update({ where: { id: args.id }, data });
  }

  async deleteUser(userId: string, id: string) {
    requireOwner(id, userId);

    const user = await this.core.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await this.core.user.delete({
      where: {
        id,
      },
    });

    await emailQueue.add(
      "user.deleted",
      {
        email: user.email,
        name: user.name,
      },
      {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return true;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const data: Prisma.ProfileUpdateInput = clean(input as unknown as Record<string, unknown>) as Prisma.ProfileUpdateInput;
    return this.core.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data } as Prisma.ProfileCreateInput,
    });
  }

  getUsers() {
    return this.core.user.findMany();
  }

  getUser(id: string) {
    return this.core.user.findUnique({ where: { id } });
  }

  getMe(userId?: string) {
    if (!userId) return null;
    return this.core.user.findUnique({ where: { id: userId } });
  }
}
