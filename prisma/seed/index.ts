import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { createEmptyCounts, type SeedCounts } from "./types.js";
import { resetDatabase, printElapsed } from "./utils.js";
import { seedUsers } from "./seed-users.js";
import { seedAddresses } from "./seed-addresses.js";
import { seedTags } from "./seed-tags.js";
import { seedCategories } from "./seed-categories.js";
import { seedPosts } from "./seed-posts.js";
import { seedComments } from "./seed-comments.js";
import { seedLikes } from "./seed-likes.js";
import { seedFollows } from "./seed-follows.js";
import { seedNotifications } from "./seed-notifications.js";
import { seedSavedPosts } from "./seed-savedPosts.js";
import { seedPostViews } from "./seed-postViews.js";
import { seedProducts } from "./seed-products.js";
import { seedReviews } from "./seed-reviews.js";
import { seedWishlists } from "./seed-wishlists.js";
import { seedCarts } from "./seed-carts.js";
import { seedCoupons } from "./seed-coupons.js";
import { seedOrders } from "./seed-orders.js";
import { seedPayments } from "./seed-payments.js";
import { seedShipments } from "./seed-shipments.js";
import { seedRefunds } from "./seed-refunds.js";
import { seedDiscounts } from "./seed-discounts.js";
import { seedSubscriptions } from "./seed-subscriptions.js";
import { seedConversations } from "./seed-conversations.js";
import { seedInvoices } from "./seed-invoices.js";
import { seedReturns } from "./seed-returns.js";
import { seedTickets } from "./seed-tickets.js";
import { seedUserCategoryFollows } from "./seed-userCategoryFollows.js";
import { seedNovu } from "./seed-novu.js";

const USER_COUNT = 65;
const POST_COUNT = 130;
const PRODUCT_COUNT = 130;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const flag = process.argv[2] ?? "";
  const ctx = { prisma };

  if (flag === "--reset" || flag === "-r") {
    await resetDatabase(prisma);
    console.log("Database reset complete.");
    return;
  }

  if (flag === "--fresh" || flag === "-f") {
    await resetDatabase(prisma);
    console.log("Database reset complete. Now seeding...\n");
  }

  console.log("Seeding database...\n");
  const start = Date.now();
  const counts: SeedCounts = createEmptyCounts();

  // Phase 1 — Independent tables
  console.log("[1/8] Users, Tags, Categories, Novu...");
  const [userIds, tagIds, categoryIds] = await Promise.all([
    seedUsers(ctx, counts, USER_COUNT),
    seedTags(ctx, counts),
    seedCategories(ctx, counts),
    seedNovu(ctx, counts),
  ]);

  // Phase 2 — Content tables (depend on users, tags, categories)
  console.log("[2/8] Posts, Products...");
  const [postIds, productIds] = await Promise.all([
    seedPosts(ctx, counts, userIds, tagIds, categoryIds, POST_COUNT),
    seedProducts(ctx, counts, userIds, categoryIds, PRODUCT_COUNT),
  ]);

  // Phase 3 — Comments, Likes, Follows, Addresses
  console.log("[3/8] Comments, Likes, Follows, Addresses...");
  await Promise.all([
    seedComments(ctx, counts, userIds, postIds),
    seedLikes(ctx, counts, userIds, postIds),
    seedFollows(ctx, counts, userIds),
    seedAddresses(ctx, counts, userIds),
    seedUserCategoryFollows(ctx, counts, userIds, categoryIds),
  ]);

  // Phase 4 — Shopping-related (carts, wishlists, reviews)
  console.log("[4/8] Carts, Wishlists, Reviews...");
  await Promise.all([
    seedCarts(ctx, counts, userIds, productIds),
    seedWishlists(ctx, counts, userIds, productIds),
    seedReviews(ctx, counts, userIds, productIds),
  ]);

  // Phase 5 — Commerce (coupons, orders, payments, shipments, refunds)
  console.log("[5/8] Coupons, Orders, Payments, Shipments, Refunds...");
  const couponIds = await seedCoupons(ctx, counts, userIds);
  const orderIds = await seedOrders(ctx, counts, userIds, productIds, couponIds);
  await Promise.all([seedPayments(ctx, counts, orderIds), seedShipments(ctx, counts, orderIds)]);
  await seedRefunds(ctx, counts, orderIds);

  // Phase 6 — Discounts, Notifications, Subscriptions
  console.log("[6/8] Discounts, Notifications, Subscriptions...");
  await Promise.all([seedDiscounts(ctx, counts, userIds, productIds), seedNotifications(ctx, counts, userIds), seedSubscriptions(ctx, counts, userIds)]);

  // Phase 7 — Saved posts, Post views, Conversations
  console.log("[7/8] Saved Posts, Post Views, Conversations...");
  await Promise.all([
    seedSavedPosts(ctx, counts, userIds, postIds),
    seedPostViews(ctx, counts, postIds, userIds),
    seedConversations(ctx, counts, userIds),
  ]);

  // Phase 8 — Invoices, Returns, Support Tickets
  console.log("[8/8] Invoices, Returns, Support Tickets...");
  await Promise.all([seedInvoices(ctx, counts, orderIds), seedReturns(ctx, counts, userIds, orderIds), seedTickets(ctx, counts, userIds, orderIds)]);

  // Summary
  printElapsed(start);
  console.log(
    `Summary: ${counts.users} users, ${counts.products} products, ` +
      `${counts.orders} orders, ${counts.messages} messages, ` +
      `${counts.posts} posts, ${counts.comments} comments, ` +
      `${counts.reviews} reviews, ${counts.tickets} tickets, ` +
      `${counts.categories} categories`,
  );
}

main()
  .catch((e: unknown) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
