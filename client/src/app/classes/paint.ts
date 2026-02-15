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
}
