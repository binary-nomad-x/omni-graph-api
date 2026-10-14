import type { Prisma, PrismaClient } from "@prisma/client";
import type { Novu } from "@novu/node";
import { logger } from "@gql-prisma-api/utils/logger.js";
import { AppError, NotFoundError } from "@gql-prisma-api/utils/errors.js";
import { clean } from "@gql-prisma-api/lib/core.js";
import type { VariableType, PayloadValidationError, PayloadValidationResult, NovuWorkflowDef, TriggerResult } from "@gql-prisma-api/modules/novu/models/index.js";
import type {
  CreateVariableGroupInput,
  UpdateVariableGroupInput,
  CreateVariableInput,
  UpdateVariableInput,
  TriggerWorkflowInput,
  CreateNovuSubscriberInput,
} from "./dto/index.js";
import { randomUUID } from "node:crypto";

export class NovuService {
  constructor(
    private readonly core: PrismaClient,
    private readonly novu: Novu | null,
  ) {}

  // ─── Workflow Metadata CRUD ───────────────────────────────────

  async listWorkflows(limit = 20, offset = 0) {
    return this.core.novuWorkflow.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });
  }

  async getWorkflow(id: string) {
    const wf = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!wf) throw new NotFoundError("Workflow");
    return wf;
  }

  async createWorkflow(name: string, description?: string | null, tags?: string[]) {
    const workflow = await this.core.novuWorkflow.create({
      data: {
        name,
        description: description ?? null,
        tags: tags ?? [],
        workflowId: `wf-${randomUUID().slice(0, 8)}`,
      },
    });
    logger.info("Novu workflow metadata created", { id: workflow.id, name });
    return workflow;
  }

  async updateWorkflow(id: string, data: { name?: string; description?: string | null; tags?: string[]; status?: string; active?: boolean }) {
    const existing = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Workflow");
    const updated = await this.core.novuWorkflow.update({
      where: { id },
      data: clean(data as Record<string, unknown>) as Prisma.NovuWorkflowUpdateInput,
    });
    logger.info("Novu workflow metadata updated", { id });
    return updated;
  }

  async deleteWorkflow(id: string) {
    const existing = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Workflow");
    await this.core.novuWorkflow.delete({ where: { id } });
    logger.info("Novu workflow metadata deleted", { id });
    return true;
  }

  async archiveWorkflow(id: string) {
    const existing = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Workflow");
    const updated = await this.core.novuWorkflow.update({
      where: { id },
      data: { status: "ARCHIVED", active: false },
    });
    logger.info("Novu workflow archived", { id });
    return updated;
  }

  async duplicateWorkflow(id: string) {
    const existing = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Workflow");
    const copy = await this.core.novuWorkflow.create({
      data: {
        name: `${existing.name} (Copy)`,
        description: existing.description,
        tags: existing.tags,
        workflowId: `wf-${randomUUID().slice(0, 8)}`,
        status: "DRAFT",
      },
    });
    logger.info("Novu workflow duplicated", { sourceId: id, newId: copy.id });
    return copy;
  }

  async publishWorkflow(id: string) {
    const existing = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Workflow");
    const updated = await this.core.novuWorkflow.update({
      where: { id },
      data: { status: "ACTIVE", active: true },
    });
    logger.info("Novu workflow published", { id });
    return updated;
  }

  // ─── Variable Registry ────────────────────────────────────────

  async createVariableGroup(input: CreateVariableGroupInput) {
    return this.core.novuVariableGroup.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async updateVariableGroup(id: string, input: UpdateVariableGroupInput) {
    const existing = await this.core.novuVariableGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("VariableGroup");
    return this.core.novuVariableGroup.update({
      where: { id },
      data: clean(input as Record<string, unknown>) as Prisma.NovuVariableGroupUpdateInput,
    });
  }

  async deleteVariableGroup(id: string) {
    const existing = await this.core.novuVariableGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("VariableGroup");
    await this.core.novuVariableGroup.delete({ where: { id } });
    logger.info("Novu variable group deleted", { id });
    return true;
  }

  async getVariableGroups() {
    return this.core.novuVariableGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: { variables: { orderBy: { key: "asc" } } },
    });
  }

  async getVariableGroup(id: string) {
    const group = await this.core.novuVariableGroup.findUnique({
      where: { id },
      include: { variables: { orderBy: { key: "asc" } } },
    });
    if (!group) throw new NotFoundError("VariableGroup");
    return group;
  }

  async getVariables(groupId: string) {
    return this.core.novuVariable.findMany({
      where: { groupId },
      orderBy: { key: "asc" },
    });
  }

  async createVariable(input: CreateVariableInput) {
    const group = await this.core.novuVariableGroup.findUnique({ where: { id: input.groupId } });
    if (!group) throw new NotFoundError("VariableGroup");
    return this.core.novuVariable.create({
      data: {
        groupId: input.groupId,
        key: input.key,
        type: input.type,
        label: input.label ?? null,
        description: input.description ?? null,
        exampleValue: input.exampleValue ?? null,
        required: input.required ?? false,
        defaultValue: input.defaultValue ?? null,
        validationRules: input.validationRules as any,
        aliases: input.aliases ?? [],
      },
    });
  }

  async updateVariable(id: string, input: UpdateVariableInput) {
    const existing = await this.core.novuVariable.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Variable");
    return this.core.novuVariable.update({
      where: { id },
      data: clean(input as Record<string, unknown>) as Prisma.NovuVariableUpdateInput,
    });
  }

  async deleteVariable(id: string) {
    const existing = await this.core.novuVariable.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Variable");
    await this.core.novuVariable.delete({ where: { id } });
    logger.info("Novu variable deleted", { id });
    return true;
  }

  // ─── Payload Builder ──────────────────────────────────────────

  async buildPayloadSchema(workflowId: string) {
    await this.ensureWorkflowExists(workflowId);
    const variables = await this.core.novuVariable.findMany({
      include: { group: true },
      orderBy: [{ group: { sortOrder: "asc" } }, { key: "asc" }],
    });
    return this.toJsonSchema(variables);
  }

  async buildPayload(workflowId: string) {
    await this.ensureWorkflowExists(workflowId);
    const variables = await this.core.novuVariable.findMany({
      include: { group: true },
      orderBy: [{ group: { sortOrder: "asc" } }, { key: "asc" }],
    });
    return this.toSamplePayload(variables);
  }

  async previewPayload(workflowId: string) {
    return this.buildPayload(workflowId);
  }

  async validatePayload(workflowId: string, payload: Record<string, unknown>): Promise<PayloadValidationResult> {
    await this.ensureWorkflowExists(workflowId);
    const variables = await this.core.novuVariable.findMany({
      include: { group: true },
      orderBy: [{ group: { sortOrder: "asc" } }, { key: "asc" }],
    });
    return this.validateAgainstVariables(variables, payload);
  }

  // ─── Trigger ──────────────────────────────────────────────────

  async triggerWorkflow(input: TriggerWorkflowInput): Promise<TriggerResult> {
    const workflow = await this.core.novuWorkflow.findUnique({ where: { id: input.workflowId } });
    if (!workflow) throw new NotFoundError("Workflow");

    const variables = await this.core.novuVariable.findMany({
      include: { group: true },
    });
    const validation = this.validateAgainstVariables(variables, input.payload);
    if (!validation.valid) {
      throw new AppError(`Payload validation failed: ${validation.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`, "VALIDATION_ERROR", 400);
    }

    if (!this.novu) {
      logger.warning("Novu trigger skipped — novu client is null", {
        workflowId: input.workflowId,
        subscriberId: input.subscriberId,
      });
      return { acknowledged: false, status: "SKIPPED", transactionId: "" };
    }

    try {
      const result = await this.novu.trigger(workflow.workflowId, {
        to: { subscriberId: input.subscriberId },
        payload: input.payload as any,
        overrides: input.overrides ?? undefined,
        tenant: input.tenant ?? undefined,
      });

      const triggerId = (result as any)?.data?.id || "";
      const status = (result as any)?.data?.status || "TRIGGERED";

      logger.info("Novu workflow trigger succeeded", {
        workflowId: input.workflowId,
        subscriberId: input.subscriberId,
        triggerId,
      });

      return { acknowledged: true, status, transactionId: triggerId };
    } catch (error) {
      logger.error("Novu workflow trigger failed", {
        workflowId: input.workflowId,
        subscriberId: input.subscriberId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError(`Failed to trigger workflow: ${error instanceof Error ? error.message : String(error)}`, "TRIGGER_FAILED", 500);
    }
  }

  // ─── Subscriber ───────────────────────────────────────────────

  async createSubscriber(input: CreateNovuSubscriberInput) {
    if (!this.novu) {
      logger.warning("Novu subscriber identify skipped — novu client is null", {
        subscriberId: input.subscriberId,
      });
      return { subscriberId: input.subscriberId, acknowledged: false };
    }

    try {
      const data: Record<string, unknown> = {};
      if (input.email !== undefined && input.email !== null) data.email = input.email;
      if (input.firstName !== undefined && input.firstName !== null) data.firstName = input.firstName;
      if (input.lastName !== undefined && input.lastName !== null) data.lastName = input.lastName;
      if (input.phone !== undefined && input.phone !== null) data.phone = input.phone;
      if (input.locale !== undefined && input.locale !== null) data.locale = input.locale;
      if (input.data !== undefined && input.data !== null) data.data = input.data;

      await this.novu.subscribers.identify(input.subscriberId, data);

      logger.info("Novu subscriber identified", {
        subscriberId: input.subscriberId,
        email: input.email,
      });

      return { subscriberId: input.subscriberId, acknowledged: true };
    } catch (error) {
      logger.error("Novu subscriber identify failed", {
        subscriberId: input.subscriberId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError(`Failed to identify subscriber: ${error instanceof Error ? error.message : String(error)}`, "SUBSCRIBER_ERROR", 500);
    }
  }

  async updateSubscriber(subscriberId: string, input: Partial<CreateNovuSubscriberInput>) {
    if (!this.novu) {
      logger.warning("Novu subscriber update skipped — novu client is null", { subscriberId });
      return { subscriberId, acknowledged: false };
    }

    try {
      const data: Record<string, unknown> = {};
      if (input.email !== undefined && input.email !== null) data.email = input.email;
      if (input.firstName !== undefined && input.firstName !== null) data.firstName = input.firstName;
      if (input.lastName !== undefined && input.lastName !== null) data.lastName = input.lastName;
      if (input.phone !== undefined && input.phone !== null) data.phone = input.phone;
      if (input.locale !== undefined && input.locale !== null) data.locale = input.locale;
      if (input.data !== undefined && input.data !== null) data.data = input.data;

      await this.novu.subscribers.update(subscriberId, data);

      logger.info("Novu subscriber updated", { subscriberId });
      return { subscriberId, acknowledged: true };
    } catch (error) {
      logger.error("Novu subscriber update failed", {
        subscriberId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError(`Failed to update subscriber: ${error instanceof Error ? error.message : String(error)}`, "SUBSCRIBER_ERROR", 500);
    }
  }

  async deleteSubscriber(subscriberId: string) {
    if (!this.novu) {
      logger.warning("Novu subscriber delete skipped — novu client is null", { subscriberId });
      return { subscriberId, acknowledged: false };
    }

    try {
      await this.novu.subscribers.delete(subscriberId);
      logger.info("Novu subscriber deleted", { subscriberId });
      return { subscriberId, acknowledged: true };
    } catch (error) {
      logger.error("Novu subscriber delete failed", {
        subscriberId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError(`Failed to delete subscriber: ${error instanceof Error ? error.message : String(error)}`, "SUBSCRIBER_ERROR", 500);
    }
  }

  async getSubscriber(subscriberId: string) {
    if (!this.novu) {
      logger.warning("Novu subscriber get skipped — novu client is null", { subscriberId });
      return null;
    }

    try {
      const result = await this.novu.subscribers.get(subscriberId);
      logger.info("Novu subscriber retrieved", { subscriberId });
      return (result as any)?.data ?? null;
    } catch (error) {
      logger.error("Novu subscriber get failed", {
        subscriberId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  // ─── Novu API (SDK) ──────────────────────────────────────────

  async getWorkflowDefs(): Promise<NovuWorkflowDef[]> {
    if (!this.novu) {
      logger.debug("Novu workflow defs skipped — novu client is null");
      return [];
    }

    try {
      if (typeof (this.novu as any).workflows === "undefined") {
        logger.debug("Novu SDK does not support workflow listing in this version");
        return [];
      }
      const result = await (this.novu as any).workflows.list();
      return (result as any)?.data ?? [];
    } catch (error) {
      logger.error("Failed to fetch Novu workflow definitions", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async getWorkflowDef(workflowId: string): Promise<NovuWorkflowDef | null> {
    if (!this.novu) {
      logger.debug("Novu workflow def skipped — novu client is null");
      return null;
    }

    try {
      if (typeof (this.novu as any).workflows === "undefined") {
        logger.debug("Novu SDK does not support workflow retrieval in this version");
        return null;
      }
      const result = await (this.novu as any).workflows.get(workflowId);
      return (result as any)?.data ?? null;
    } catch (error) {
      logger.error("Failed to fetch Novu workflow definition", {
        workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async ensureWorkflowExists(id: string) {
    const wf = await this.core.novuWorkflow.findUnique({ where: { id } });
    if (!wf) throw new NotFoundError("Workflow");
    return wf;
  }

  private mapVariableType(type: string): string {
    const map: Record<string, string> = {
      STRING: "string",
      NUMBER: "number",
      BOOLEAN: "boolean",
      DATE: "string",
      OBJECT: "object",
      ARRAY: "array",
    };
    return map[type] ?? "string";
  }

  private toJsonSchema(
    variables: Array<{
      key: string;
      type: string;
      label: string | null;
      description: string | null;
      required: boolean;
      defaultValue: string | null;
      exampleValue: string | null;
      aliases: string[];
    }>,
  ): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const v of variables) {
      const schema: Record<string, unknown> = {
        type: this.mapVariableType(v.type),
      };
      if (v.type === "DATE") schema.format = "date-time";
      if (v.label) schema.label = v.label;
      if (v.description) schema.description = v.description;
      if (v.defaultValue !== null) schema.default = v.defaultValue;
      if (v.aliases.length > 0) schema.aliases = v.aliases;

      properties[v.key] = schema;
      if (v.required) required.push(v.key);
    }

    return { type: "object", properties, required };
  }

  private toSamplePayload(
    variables: Array<{ key: string; type: string; exampleValue: string | null; defaultValue: string | null }>,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const v of variables) {
      const source = v.exampleValue ?? v.defaultValue;
      payload[v.key] = this.coerceSampleValue(v.type, source);
    }

    return payload;
  }

  private coerceSampleValue(type: string, raw: string | null): unknown {
    if (raw !== null) {
      switch (type) {
        case "NUMBER": {
          const n = Number(raw);
          return Number.isNaN(n) ? 0 : n;
        }
        case "BOOLEAN":
          return raw === "true" || raw === "1";
        case "DATE":
          return raw;
        default:
          return raw;
      }
    }

    switch (type) {
      case "STRING":
        return "string_value";
      case "NUMBER":
        return 0;
      case "BOOLEAN":
        return true;
      case "DATE":
        return new Date().toISOString();
      case "OBJECT":
        return {};
      case "ARRAY":
        return [];
      default:
        return null;
    }
  }

  private validateAgainstVariables(
    variables: Array<{ key: string; type: string; required: boolean }>,
    payload: Record<string, unknown>,
  ): PayloadValidationResult {
    const errors: PayloadValidationError[] = [];
    const payloadKeys = new Set(Object.keys(payload));

    for (const v of variables) {
      if (v.required && !payloadKeys.has(v.key)) {
        errors.push({
          path: v.key,
          message: `Required variable "${v.key}" is missing`,
          code: "MISSING",
        });
        continue;
      }

      if (!payloadKeys.has(v.key)) continue;

      const value = payload[v.key];

      if (value === null) {
        errors.push({
          path: v.key,
          message: `Variable "${v.key}" is null`,
          code: "NULL",
        });
        continue;
      }

      if (!this.isTypeMatch(v.type, value)) {
        errors.push({
          path: v.key,
          message: `Variable "${v.key}" expected type ${v.type} but got ${typeof value}`,
          code: "WRONG_TYPE",
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private isTypeMatch(type: string, value: unknown): boolean {
    switch (type) {
      case "STRING":
        return typeof value === "string";
      case "NUMBER":
        return typeof value === "number";
      case "BOOLEAN":
        return typeof value === "boolean";
      case "DATE":
        return typeof value === "string" || value instanceof Date;
      case "OBJECT":
        return typeof value === "object" && !Array.isArray(value) && value !== null;
      case "ARRAY":
        return Array.isArray(value);
      default:
        return true;
    }
  }
}
