import { describe, it, expect } from 'vitest';
import { paginationSchema, PaginationParams } from '../../src/lib/pagination';

describe('paginationSchema', () => {
  it('parses string "20"/"0" into numbers 20/0', () => {
    const result = paginationSchema.safeParse({ limit: '20', offset: '0' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ limit: 20, offset: 0 });
    }
  });

  it('applies defaults when both fields are absent', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ limit: 20, offset: 0 });
    }
  });

  it('accepts limit=100 (max allowed)', () => {
    const result = paginationSchema.safeParse({ limit: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('rejects limit=0 (below min 1)', () => {
    const result = paginationSchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=101 (above max 100)', () => {
    const result = paginationSchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects offset=-1 (below min 0)', () => {
    const result = paginationSchema.safeParse({ offset: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects limit="abc" (not a number)', () => {
    const result = paginationSchema.safeParse({ limit: 'abc' });
    expect(result.success).toBe(false);
  });

  it('PaginationParams type is { limit: number; offset: number }', () => {
    // Type-level test: if this compiles, the type is correct
    const params: PaginationParams = { limit: 20, offset: 0 };
    expect(typeof params.limit).toBe('number');
    expect(typeof params.offset).toBe('number');
  });
});
