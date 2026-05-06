import { describe, it, expect } from 'vitest';
import { hexToRgb } from '../../src/lib/color';

describe('hexToRgb', () => {
    it('parses a valid #RRGGBB hex string', () => {
        expect(hexToRgb('#231F20')).toEqual({ r: 35, g: 31, b: 32 });
    });

    it('parses hex without leading #', () => {
        expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('is case-insensitive', () => {
        expect(hexToRgb('#aabbcc')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('returns null for null input', () => {
        expect(hexToRgb(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(hexToRgb(undefined)).toBeNull();
    });

    it('returns null for invalid hex string', () => {
        expect(hexToRgb('#ZZZZZZ')).toBeNull();
    });

    it('returns null for short hex (3 chars)', () => {
        expect(hexToRgb('#FFF')).toBeNull();
    });

    it('returns { r: 0, g: 0, b: 0 } for black', () => {
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns { r: 255, g: 255, b: 255 } for white', () => {
        expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    });
});
