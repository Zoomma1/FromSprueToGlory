export class UserCustomPaint {
    id!: string;
    userId!: string;
    name!: string;
    type!: string | null;
    notes!: string | null;
    createdAt!: string;
}

export interface UserCustomPaintPayload {
    name: string;
    type?: string | null;
    notes?: string | null;
}