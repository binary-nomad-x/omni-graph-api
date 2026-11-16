import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";
import { CATEGORY_DATA } from "../data/categories.js";

export async function seedCategories(ctx: SeedContext, counts: SeedCounts): Promise<string[]> {
  // First pass — create root categories (no parent)
  const rootData = CATEGORY_DATA.filter((c) => !c.parentName);
  const rootCategories = await ctx.prisma.category.createManyAndReturn({
    data: rootData.map((data) => ({
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      imageUrl: faker.image.url(),
      displayOrder: data.displayOrder,
      isFeatured: data.isFeatured,
    })),
  });

  const nameToId = new Map(rootCategories.map((c) => [c.name, c.id]));

  // Second pass — create child categories with parentId
  const childData = CATEGORY_DATA.filter((c) => !!c.parentName);
  const children = await ctx.prisma.category.createManyAndReturn({
    data: childData.map((data) => ({
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      imageUrl: faker.image.url(),
      displayOrder: data.displayOrder,
      isFeatured: data.isFeatured,
      parentId: nameToId.get(data.parentName!) ?? null,
    })),
  });

  const allCategories = [...rootCategories, ...children];
  counts.categories += allCategories.length;

  return allCategories.map((c) => c.id);
}
