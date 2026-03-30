export class Paints {
    paints: Paint[] = [];
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
    brand: {
        id: string;
        name: string;
        slug: string;
    };
}
