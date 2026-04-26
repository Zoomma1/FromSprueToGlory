export class Paints {
    paints: Paint[] = [];
}

export type PaintStatus = 'owned' | 'need' | 'toBuy' | 'notOwned';
export type PaintFilter = PaintStatus | undefined;

export interface PaintWithStatus {
    id: string;
    name: string;
    hex: string | null;
    type: string;
    code: string | null;
    brand: { id: string; name: string; slug: string };
    status: PaintStatus;
    neededForSchemes?: { id: string; name: string }[];
    similarOwned?: { id: string; name: string }[];
}

export interface PaintCollectionResult {
    paints: PaintWithStatus[];
    counts: { owned: number; need: number; toBuy: number; notOwned: number };
    hasMore: boolean;
}

export class Paint {
    id!: string;
    name!: string;
    code!: string | null;
    brandId!: string;
    type!: string;
    notes!: string | null;
    brand!: {
        name: string;
        slug: string;
    };
    isCustom?: boolean;
}

export interface PaintWithEquivalents {
    id: string;
    name: string;
    code: string | null;
    brand: { name: string; slug: string };
    equivalents: SimilarPaint[];
}

export interface SimilarPaint {
    id: string;
    name: string;
    type: string;
    code: string | null;
    source: string | null;
    distance: number | null;
    brand: {
        id: string;
        name: string;
        slug: string;
    };
}
