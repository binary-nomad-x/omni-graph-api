export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "BAD_REQUEST",
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Not authenticated") {
    super(message, "UNAUTHENTICATED", 401);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Not authorized") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export function requireAuth(userId?: string): asserts userId is string {
  if (!userId) throw new AuthError();
}

export function requireOwner(ownerId: string, userId?: string): void {
  if (!userId || ownerId !== userId) {
    throw new ForbiddenError();
  }
}

export function requireRole(userRole: string | undefined, roles: string[]): void {
  if (!userRole || !roles.includes(userRole)) {
    throw new ForbiddenError(`Requires role: ${roles.join(" or ")}`);
  }
}
