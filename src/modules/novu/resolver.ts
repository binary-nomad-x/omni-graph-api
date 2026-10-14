import type { Context } from "@gql-prisma-api/types/context.js";
import { requireAuth } from "@gql-prisma-api/utils/errors.js";
import type {
  CreateVariableGroupInput,
  UpdateVariableGroupInput,
  CreateVariableInput,
  UpdateVariableInput,
  TriggerWorkflowInput,
  CreateNovuSubscriberInput,
} from "@gql-prisma-api/modules/novu/dto/index.js";

export const NovuWorkflow = {};

export const Query = {
  novuWorkflows: (_parent: unknown, args: { limit?: number | null; offset?: number | null }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.listWorkflows(args.limit ?? undefined, args.offset ?? undefined);
  },

  novuWorkflow: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getWorkflow(args.id);
  },

  novuWorkflowDef: (_parent: unknown, args: { workflowId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getWorkflowDef(args.workflowId);
  },

  novuWorkflowDefs: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getWorkflowDefs();
  },

  novuVariableGroups: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getVariableGroups();
  },

  novuVariableGroup: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getVariableGroup(args.id);
  },

  novuVariables: (_parent: unknown, args: { groupId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getVariables(args.groupId);
  },

  novuPayloadSchema: (_parent: unknown, args: { workflowId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.buildPayloadSchema(args.workflowId);
  },

  novuValidatePayload: (_parent: unknown, args: { workflowId: string; payload: Record<string, unknown> }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.validatePayload(args.workflowId, args.payload);
  },

  novuBuildPayload: (_parent: unknown, args: { workflowId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.buildPayload(args.workflowId);
  },

  novuPreviewPayload: (_parent: unknown, args: { workflowId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.previewPayload(args.workflowId);
  },

  novuSubscriber: (_parent: unknown, args: { subscriberId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.getSubscriber(args.subscriberId);
  },

  novuTemplates: (_parent: unknown, _args: unknown, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novuTemplate.list();
  },

  novuTemplate: (_parent: unknown, args: { type: string; slug: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novuTemplate.get(args.type as "workflow" | "layout", args.slug);
  },
};

export const Mutation = {
  createNovuWorkflow: (_parent: unknown, args: { name: string; description?: string | null; tags?: string[] | null }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.createWorkflow(args.name, args.description ?? undefined, args.tags ?? undefined);
  },

  updateNovuWorkflow: (
    _parent: unknown,
    args: {
      id: string;
      name?: string | null;
      description?: string | null;
      tags?: string[] | null;
      active?: boolean | null;
    },
    ctx: Context,
  ) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.updateWorkflow(args.id, {
      name: args.name ?? undefined,
      description: args.description ?? undefined,
      tags: args.tags ?? undefined,
      active: args.active ?? undefined,
    });
  },

  deleteNovuWorkflow: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.deleteWorkflow(args.id);
  },

  archiveNovuWorkflow: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.archiveWorkflow(args.id);
  },

  publishNovuWorkflow: (_parent: unknown, args: { workflowId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.publishWorkflow(args.workflowId);
  },

  duplicateNovuWorkflow: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.duplicateWorkflow(args.id);
  },

  createNovuVariableGroup: (_parent: unknown, args: { input: CreateVariableGroupInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.createVariableGroup(args.input);
  },

  updateNovuVariableGroup: (_parent: unknown, args: { id: string; input: UpdateVariableGroupInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.updateVariableGroup(args.id, args.input);
  },

  deleteNovuVariableGroup: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.deleteVariableGroup(args.id);
  },

  createNovuVariable: (_parent: unknown, args: { input: CreateVariableInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.createVariable(args.input);
  },

  updateNovuVariable: (_parent: unknown, args: { id: string; input: UpdateVariableInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.updateVariable(args.id, args.input);
  },

  deleteNovuVariable: (_parent: unknown, args: { id: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.deleteVariable(args.id);
  },

  triggerNovuWorkflow: (_parent: unknown, args: { input: TriggerWorkflowInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.triggerWorkflow(args.input);
  },

  createNovuSubscriber: (_parent: unknown, args: { input: CreateNovuSubscriberInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.createSubscriber(args.input);
  },

  updateNovuSubscriber: (_parent: unknown, args: { subscriberId: string; input: CreateNovuSubscriberInput }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.updateSubscriber(args.subscriberId, args.input);
  },

  deleteNovuSubscriber: (_parent: unknown, args: { subscriberId: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novu.deleteSubscriber(args.subscriberId);
  },

  pullNovuTemplates: (_parent: unknown, args: { type?: string | null }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novuTemplate.pullAll();
  },

  pullNovuTemplate: (_parent: unknown, args: { type: string; slug: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    if (args.type === "layout") return ctx.services.novuTemplate.pullLayout(args.slug);
    return ctx.services.novuTemplate.pullWorkflow(args.slug);
  },

  pushNovuTemplates: (_parent: unknown, args: { slug?: string | null }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novuTemplate.push(args.slug ?? undefined);
  },

  saveNovuTemplate: (_parent: unknown, args: { type: string; slug: string; input: Record<string, unknown> }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novuTemplate.createOrUpdateLocal(
      args.type as "workflow" | "layout",
      args.slug,
      args.input as { name: string; description?: string; tags?: string[]; active?: boolean; data?: Record<string, unknown> },
    );
  },

  deleteNovuTemplate: (_parent: unknown, args: { type: string; slug: string }, ctx: Context) => {
    requireAuth(ctx.userId);
    return ctx.services.novuTemplate.delete(args.type as "workflow" | "layout", args.slug);
  },
};
