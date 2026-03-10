# TESTING.md — Test Structure & Practices

## Overview

Two separate test setups — one per layer:

| Layer | Framework | Config |
|-------|-----------|--------|
| Server | Vitest | `server/vitest.config.ts` |
| Client | Karma + Jasmine | `client/karma.conf.js` |

---

## Server Tests (Vitest)

### Setup

- Config: `server/vitest.config.ts`
- Globals enabled, Node environment
- Run commands:
  - `npm test` — single run
  - `npm run test:watch` — watch mode

### Structure

- Tests live in `server/tests/`
- Pattern: full route integration tests with Prisma mocked
- Example: `server/tests/auth.test.ts` (342 lines, covers all auth branches)

### Mocking

- Prisma mocked via `vi.mock()` — deep mock of all Prisma methods
- bcrypt also mocked where needed
- Pattern:

```typescript
vi.mock('../src/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));
```

### Coverage

- No coverage enforcement visible in config
- Coverage output not configured to a specific threshold

---

## Client Tests (Karma + Jasmine)

### Setup

- Config: `client/karma.conf.js`
- Run: `ng test` (default watch mode)
- Coverage reported to `coverage/client/`

### Structure

- 16 spec files in `client/src/`
- Co-located with components (`*.spec.ts` next to `*.ts`)
- Example: `client/src/app/app.component.spec.ts` (102 lines)

### Mocking

- Stub objects via `jasmine.createSpyObj()`
- TestBed for dependency injection overrides
- Pattern:

```typescript
const serviceSpy = jasmine.createSpyObj('MyService', ['getItems']);
TestBed.configureTestingModule({
  providers: [{ provide: MyService, useValue: serviceSpy }],
});
```

### Structure Pattern

```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ ... }).compileComponents();
    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should do something', () => {
    expect(component.value).toBe(expected);
  });
});
```

---

## Test Gaps & Notes

- No E2E test framework configured (no Playwright/Cypress)
- Server tests cover auth routes thoroughly; other routes may have less coverage
- Client specs exist but coverage enforcement not configured
- No shared test utilities or factories observed