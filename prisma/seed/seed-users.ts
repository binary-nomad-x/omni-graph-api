import { faker } from "@faker-js/faker";
import { logger } from "../../src/utils/logger.js";
import bcrypt from "bcryptjs";
import type { SeedContext, SeedCounts, UserSeed } from "./types.js";
import { userData } from "../data/users.js";

export async function seedUsers(ctx: SeedContext, counts: SeedCounts, count: number): Promise<string[]> {
  const password = "password123";
  const passwordHash = bcrypt.hashSync(password, 10);

  const roles = ["USER", "USER", "USER", "SELLER", "MANAGER"];

  for (let i = userData.length; i < count; i++) {
    userData.push({
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.username().toLowerCase(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 18, max: 60 }),
      role: faker.helpers.arrayElement(roles),
      password: passwordHash,
      avatarUrl: faker.image.avatar(),
      bio: faker.lorem.sentence({ min: 5, max: 30 }),
      phone: faker.phone.number(),
      isVerified: faker.datatype.boolean({ probability: 0.7 }),
      lastLoginAt: faker.date.recent({ days: 30 }),
      locale: faker.helpers.arrayElement(["en-US", "en-GB", "es-ES", "fr-FR", "de-DE"]),
      timezone: faker.helpers.arrayElement([
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Berlin",
      ]),
      metadata: {
        signupSource: faker.helpers.arrayElement(["web", "mobile", "referral"]),
        memberSince: faker.date.past({ years: 2 }).toISOString(),
        loyaltyTier: faker.helpers.arrayElement(["bronze", "silver", "gold", "platinum"]),
      },
    });
  }

  const users = await Promise.all(
    userData.map(({ locale, timezone, metadata, ...data }) =>
      ctx.prisma.user.create({
        data: {
          ...data,
          locale,
          timezone,
          metadata: JSON.parse(JSON.stringify(metadata)),
        },
      }),
    ),
  );

  await Promise.all(
    users.map((user) =>
      ctx.prisma.profile.create({
        data: {
          userId: user.id,
          bio: faker.lorem.sentence({ min: 5, max: 30 }),
          avatar: faker.image.avatar(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          fullName: faker.person.fullName(),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
          gender: faker.helpers.arrayElement(["male", "female", "other"]),
          occupation: faker.person.jobTitle(),
          company: faker.company.name(),
          website: faker.internet.url(),
          education: faker.helpers.arrayElement(["High School", "Bachelor's", "Master's", "PhD", "Associate's"]),
          newsletter: faker.datatype.boolean({ probability: 0.8 }),
          marketingOptIn: faker.datatype.boolean({ probability: 0.6 }),
        },
      }),
    ),
  );

  counts.users += users.length;
  counts.profiles += users.length;

  const userIds = users.map((u) => u.id);

  // Print only one account per role
  logger.info("\n========================================");
  logger.info(" Test Accounts");
  logger.info("========================================");

  const shownRoles = new Set<string>();

  for (const user of userData) {
    if (shownRoles.has(user.role)) continue;

    shownRoles.add(user.role);

    logger.info(`${user.role.padEnd(10)} | ${user.email.padEnd(28)} | ${password}`);
  }

  logger.info("========================================\n");

  return userIds;
}
