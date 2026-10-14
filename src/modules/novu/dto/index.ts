import type { VariableType } from "../models/index.js";

export interface CreateVariableGroupInput {
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface UpdateVariableGroupInput {
  name?: string | null;
  description?: string | null;
  sortOrder?: number | null;
}

export interface CreateVariableInput {
  groupId: string;
  key: string;
  type: VariableType;
  label?: string | null;
  description?: string | null;
  exampleValue?: string | null;
  required?: boolean | null;
  defaultValue?: string | null;
  validationRules?: Record<string, unknown> | null;
  aliases?: string[] | null;
}

export interface UpdateVariableInput {
  key?: string | null;
  type?: VariableType | null;
  label?: string | null;
  description?: string | null;
  exampleValue?: string | null;
  required?: boolean | null;
  defaultValue?: string | null;
  validationRules?: Record<string, unknown> | null;
  aliases?: string[] | null;
}

export interface TriggerWorkflowInput {
  workflowId: string;
  subscriberId: string;
  payload: Record<string, unknown>;
  overrides?: Record<string, unknown> | null;
  tenant?: string | null;
}

export interface CreateNovuSubscriberInput {
  subscriberId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
  data?: Record<string, unknown> | null;
}
