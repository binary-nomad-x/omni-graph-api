import type { Context } from "@gql-prisma-api/types/context.js";
import type { Address as AddressModel } from "@prisma/client";
import type { IdArg } from "@gql-prisma-api/types/graphql.js";
import type { CreateAddressInput, UpdateAddressInput } from "@gql-prisma-api/modules/address/dto/index.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";

export const Address = {
  user: (parent: AddressModel, _args: unknown, ctx: Context) => ctx.services.address.resolveAddressUser(parent.userId),
};

export const Query = {
  myAddresses: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.address.getMyAddresses(ctx.userId);
  },

  address: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.address.getAddress(ctx.userId, id);
  },
};

export const Mutation = {
  createAddress: (_parent: unknown, { input }: { input: CreateAddressInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.address.createAddress(ctx.userId, input);
  },

  updateAddress: (_parent: unknown, { id, input }: { id: string; input: UpdateAddressInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.address.updateAddress(ctx.userId, id, input);
  },

  deleteAddress: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.address.deleteAddress(ctx.userId, id);
  },

  setDefaultAddress: (_parent: unknown, { id }: IdArg, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.address.setDefaultAddress(ctx.userId, id);
  },
};
