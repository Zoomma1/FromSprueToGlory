export class PaintBrands {
    paintBrands: PaintBrand[] = [];
}

export class PaintBrand {
    id!: string;
    name!: string;
    slug!: string;
    paintCount!: number;
}
