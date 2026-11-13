import { defaultFieldResolver, type GraphQLSchema } from "graphql";
import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { ForbiddenError } from "@gql-prisma-api/utils/errors.js";
import type { Context } from "@gql-prisma-api/types/context.js";

export const authDirectiveName = "auth";

/**
 * Enforces the `@auth` SDL directive: rejects unauthenticated requests
 * on fields marked with it. Declarative auth — matches the README.
 */
export function authDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, authDirectiveName)?.[0];
      if (directive) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async (source, args, context: Context, info) => {
          if (!context?.userId) {
            throw new ForbiddenError("Not authenticated — this field requires @auth");
          }
          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}