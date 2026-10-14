export interface UpdateUserInput {
  name?: string | null;
  email?: string | null;
  password?: string | null;
}

export interface UpdateProfileInput {
  bio?: string | null;
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
}
