import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateAddressInput, UpdateAddressInput } from "@gql-prisma-api/modules/address/dto/index.js";
import { clean } from "@gql-prisma-api/lib/core.js";

export class AddressService {
  constructor(private readonly core: PrismaClient) { }

  resolveAddressUser(userId: string) {
    return this.core.user.findUnique({ where: { id: userId } });
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    const data: Prisma.AddressCreateInput = clean({
      ...input,
      userId,
      country: input.country ?? "US",
      label: input.label ?? "Home",
    }) as unknown as Prisma.AddressCreateInput;

    try {
      return await this.core.address.create({ data });
    } catch (e: any) {
      if (e?.code === "P2002") {
        throw new Error("This label already exists for this user");
      }
      throw e;
    }
  }

  async updateAddress(userId: string, id: string, input: UpdateAddressInput) {
    const addr = await this.core.address.findFirst({
      where: { id, userId },
    });

    if (!addr) throw new Error("Address not found");

    const nextLabel = input.label ?? addr.label;

    try {
      return await this.core.address.update({
        where: { id },
        data: {
          label: input.label ?? undefined,
          street: input.street ?? undefined,
          city: input.city ?? undefined,
          zip: input.zip ?? undefined,
          country: input.country ?? undefined,
          isDefault: input.isDefault ?? undefined,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        throw new Error("This label already exists for this user");
      }
      throw e;
    }
  }

  async deleteAddress(userId: string, id: string) {
    const addr = await this.core.address.findFirst({
      where: { id, userId },
    });

    if (!addr) throw new Error("Address not found");

    await this.core.address.delete({ where: { id } });
    return true;
  }

  async setDefaultAddress(userId: string, id: string) {
    await this.core.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.core.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  getMyAddresses(userId: string) {
    return this.core.address.findMany({ where: { userId } });
  }

  async getAddress(userId: string, id: string) {
    return this.core.address.findFirst({ where: { id, userId } });
  }
}