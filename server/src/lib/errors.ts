// ──────────────────────────────────────────────────────────
// Error Hierarchy — AppError base class + domain subclasses
// ──────────────────────────────────────────────────────────
// WHY Object.setPrototypeOf?
//   TypeScript compiles class extends to ES5 which breaks instanceof
//   for Error subclasses. Object.setPrototypeOf restores the correct
//   prototype chain so `err instanceof NotFoundError` works at runtime.
// ──────────────────────────────────────────────────────────

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(404, message);
    }
}

export class ValidationError extends AppError {
    constructor(
        message = 'Validation failed',
        public readonly details?: unknown,
    ) {
        super(400, message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(409, message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}
