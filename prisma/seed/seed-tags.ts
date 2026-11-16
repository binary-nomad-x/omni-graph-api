import { TAG_DATA } from "../data/tags.js";
import type { SeedContext, SeedCounts } from "./types.js";

export async function seedTags(ctx: SeedContext, counts: SeedCounts): Promise<string[]> {
  const tags = await ctx.prisma.tag.createManyAndReturn({
    data: TAG_DATA.map((data) => ({
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color,
      icon: data.icon,
      isFeatured: data.isFeatured,
    })),
  });

  counts.tags += tags.length;

  return tags.map((tag) => tag.id);
}
