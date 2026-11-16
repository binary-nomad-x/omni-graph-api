import { faker } from "@faker-js/faker";
import type { SeedContext, SeedCounts } from "./types.js";

export async function seedAddresses(ctx: SeedContext, counts: SeedCounts, userIds: string[]): Promise<void> {
  const data: {
    userId: string;
    label: string;
    street: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    deliveryInstructions: string | null;
    latitude: number;
    longitude: number;
    isDefault: boolean;
    isBilling: boolean;
    contactName: string;
    contactPhone: string;
  }[] = [];

  const availableLabels = ["Home", "Work", "Vacation Home", "Other"];

  for (const userId of userIds) {
    const usedLabels = new Set<string>();
    const addressCount = faker.number.int({ min: 2, max: 4 });

    for (let i = 0; i < addressCount; i++) {
      const baseLabel = availableLabels[i] ?? "Address";
      let label = baseLabel;

      if (usedLabels.has(label)) {
        let suffix = 2;
        while (usedLabels.has(`${baseLabel} ${suffix}`)) suffix++;
        label = `${baseLabel} ${suffix}`;
      }

      usedLabels.add(label);

      data.push({
        userId,
        label,
        street: faker.location.streetAddress(),
        addressLine2: Math.random() > 0.4 ? faker.location.secondaryAddress() : null,
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zip: faker.location.zipCode(),
        country: "US",
        phone: faker.phone.number(),
        deliveryInstructions:
          Math.random() > 0.5
            ? faker.helpers.arrayElement([
              "Leave at front door",
              "Ring bell twice",
              "Call upon arrival",
              "Leave with concierge",
            ])
            : null,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        isDefault: i === 0,
        isBilling: i <= 1,
        contactName: faker.person.fullName(),
        contactPhone: faker.phone.number(),
      });
    }
  }

  await ctx.prisma.address.createMany({ data });
  counts.addresses += data.length;
}