import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";

export async function seedProducts(ctx: SeedContext, counts: SeedCounts, userIds: string[], categoryIds: string[], count: number): Promise<string[]> {
  const productIds = Array.from({ length: count }, () => crypto.randomUUID());

  const productData = productIds.map((id) => {
    const name = faker.commerce.productName();
    const price = parseFloat(faker.commerce.price({ min: 5, max: 500 }));
    const brand = faker.helpers.arrayElement([
      "TechPro",
      "HomeEssentials",
      "SportMax",
      "StyleCraft",
      "EcoGoods",
      "ProGear",
      "SmartBuy",
      "LuxeLiving",
    ]);
    const color = faker.helpers.arrayElement(["Black", "White", "Red", "Blue", "Green", "Silver", "Gold", "Gray", "Navy", "Beige", "Brown"]);
    const warrantyInfo = faker.helpers.arrayElement([
      "1 Year Limited Warranty",
      "2 Year Extended Warranty",
      "Lifetime Warranty",
      "90 Day Warranty",
      "No Warranty",
    ]);
    const returnPolicy = faker.helpers.arrayElement(["30 Day Return Policy", "60 Day Return Policy", "90 Day Return Policy", "No Returns Accepted"]);
    return {
      id,
      name,
      description: faker.lorem.paragraph(),
      price,
      stock: faker.number.int({ min: 10, max: 500 }),
      sku: faker.string.alphanumeric({ length: 10 }).toUpperCase(),
      barcode: faker.string.numeric({ length: 13 }),
      brand,
      color,
      weight: parseFloat(faker.number.float({ min: 0.1, max: 25 }).toFixed(2)),
      dimensions: `${faker.number.int({ min: 5, max: 60 })}x${faker.number.int({ min: 5, max: 60 })}x${faker.number.int({ min: 1, max: 30 })}`,
      rating: parseFloat(faker.number.float({ min: 1, max: 5 }).toFixed(1)),
      reviewCount: faker.number.int({ min: 0, max: 500 }),
      soldCount: faker.number.int({ min: 0, max: 2000 }),
      minimumStock: faker.number.int({ min: 5, max: 50 }),
      allowBackorder: faker.datatype.boolean({ probability: 0.2 }),
      warrantyInfo,
      returnPolicy,
      taxClass: faker.helpers.arrayElement(["standard", "reduced", "zero", "luxury"]),
      metaTitle: name,
      metaDescription: faker.lorem.sentence(),
      attributes: {
        material: faker.helpers.arrayElement(["Cotton", "Polyester", "Leather", "Metal", "Plastic", "Wood", "Glass", "Ceramic", "Stainless Steel"]),
        origin: faker.helpers.arrayElement(["USA", "China", "Germany", "Japan", "India"]),
        warrantyMonths: faker.number.int({ min: 0, max: 36 }),
      },
      imageUrl: faker.image.url(),
      isActive: Math.random() > 0.07,
      sellerId: faker.helpers.arrayElement(userIds),
      categoryId: faker.helpers.arrayElement(categoryIds),
    };
  });

  await ctx.prisma.product.createMany({ data: productData });

  const imageData = productIds.flatMap((productId) => {
    const n = faker.number.int({ min: 2, max: 6 });
    return Array.from({ length: n }, (_, idx) => ({
      productId,
      url: faker.image.url(),
      alt: faker.lorem.words({ min: 3, max: 30 }),
      isPrimary: idx === 0,
      width: faker.number.int({ min: 200, max: 2000 }),
      height: faker.number.int({ min: 200, max: 2000 }),
      fileSize: faker.number.int({ min: 10000, max: 5000000 }),
      mimeType: faker.helpers.arrayElement(["image/jpeg", "image/png", "image/webp"]),
      sortOrder: idx,
    }));
  });

  await ctx.prisma.productImage.createMany({ data: imageData });

  counts.products += productData.length;
  counts.productImages += imageData.length;

  return productIds;
}
