import type { Novu } from "@novu/node";

// ─── Novu Client ────────────────────────────────────────────────

export interface NovuClientProvider {
  readonly novu: Novu | null;
}

// ─── Variable Registry Types ────────────────────────────────────

export type VariableType = "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "OBJECT" | "ARRAY";

export interface VariableDef {
  id: string;
  groupId: string;
  key: string;
  type: VariableType;
  label: string | null;
  description: string | null;
  exampleValue: string | null;
  required: boolean;
  defaultValue: string | null;
  validationRules: Record<string, unknown> | null;
  aliases: string[];
}

export interface VariableGroupDef {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  variables: VariableDef[];
}

// ─── Payload ────────────────────────────────────────────────────

export interface PayloadSchema {
  [key: string]: PayloadSchema | string | number | boolean | null | PayloadSchema[];
}

export interface PayloadValidationError {
  path: string;
  message: string;
  code: "MISSING" | "WRONG_TYPE" | "UNKNOWN" | "NULL" | "VALIDATION_FAILED";
}

export interface PayloadValidationResult {
  valid: boolean;
  errors: PayloadValidationError[];
}

// ─── Novu Workflow (from SDK) ──────────────────────────────────

export interface NovuWorkflowDef {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
    type: string;
    active: boolean;
    critical: boolean;
    variables: Array<{
      name: string;
      type: string;
      defaultValue?: unknown;
      required?: boolean;
    }>;
  } | null;
  triggers: Array<{
    type: string;
    identifier: string;
    variables: Array<{ name: string }>;
  }>;
  steps: Array<{
    id: string;
    name: string;
    template: {
      type: string;
      subject?: string;
      preheader?: string;
      senderName?: string;
      content?: unknown;
      contentType?: string;
    };
  }>;
}

// ─── Trigger ────────────────────────────────────────────────────

export interface TriggerOptions {
  userId: string;
  workflowId: string;
  payload: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  tenant?: string;
}

export interface TriggerResult {
  acknowledged: boolean;
  status: string;
  transactionId: string;
}

// ─── Subscriber ─────────────────────────────────────────────────

export interface SubscriberDef {
  subscriberId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: Record<string, unknown>;
}
