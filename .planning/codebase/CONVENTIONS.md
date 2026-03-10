# CONVENTIONS.md — Code Conventions & Patterns

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Routes/files | kebab-case | `color-schemes.ts`, `/api/color-schemes` |
| Functions/variables | camelCase | `getColorScheme`, `userId` |
| Types/interfaces | PascalCase | `ColorScheme`, `UserCustomPaint` |
| Constants | UPPER_SNAKE or camelCase | depends on context |
| Angular components | PascalCase + suffix | `ColorSchemeCardComponent` |

## Formatting

- **Prettier** configured with:
  - Line length: 100 characters
  - Indentation: 2 spaces
  - Quotes: single quotes
  - Trailing commas: enabled
- **ESLint 9** + TypeScript ESLint on server
- **Angular ESLint** on client

## Error Handling

### Server (Express)
- Zod validation for request bodies → 400 on validation failure
- HTTP status codes: 400 (bad request), 401 (unauthorized), 409 (conflict), 503 (unavailable)
- Try-catch in route handlers; errors propagated with appropriate status codes

### Client (Angular)
- `try-catch` with `firstValueFrom()` for async HTTP calls
- Signals for reactive state management

## Logging

- Console-only (`console.log`, `console.error`)
- ASCII dividers and emojis used in startup logs for visual clarity

## Function Size

- Typical function: 20–50 lines
- Intent made explicit via descriptive naming rather than comments

## Module Structure

### Server
- Default-export router modules per feature
- No barrel files — direct imports
- Route files organized by resource: `routes/color-schemes.ts`, `routes/auth.ts`

### Client
- `@Injectable` services with `providedIn: 'root'`
- Direct imports (no barrel `index.ts` re-exports)
- Angular Material + CDK for UI components

## TypeScript Patterns

- Strict mode enabled on both client and server
- Zod schemas on server for runtime validation and type inference
- Angular signals (`signal()`, `computed()`) for reactive state
- No `any` types (enforced via ESLint)

## API Conventions

- REST with JSON bodies
- Routes prefixed `/api/`
- Auth via `Authorization: Bearer <token>` header
- Pagination and filtering via query params where applicable

## Key Architectural Patterns

- **Color scheme steps**: replace-all strategy (delete old, insert new on save)
- **Custom paints**: `UserCustomPaint` table, merged client-side via `allPaints` computed signal
- **Auth**: JWT access token + refresh token rotation; tokens stored in memory/cookie
