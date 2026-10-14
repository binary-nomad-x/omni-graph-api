export interface CreateAddressInput {
  label?: string | null;
  street: string;
  city: string;
  state?: string | null;
  zip: string;
  country?: string | null;
  isDefault?: boolean | null;
}

export interface UpdateAddressInput {
  label?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  isDefault?: boolean | null;
}
