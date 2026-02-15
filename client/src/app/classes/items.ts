export class Items {
    items: Item[] = [];
}

export class Item {
    id!: string;
    userId!: string;
    name!: string;
    points!: number | null;
    quantity!: number;
    purchaseDate!: string | null; // ISO date string
    price!: number | null;
    currency!: string;
    store!: string | null;
    notes!: string | null;
    tags!: string[];
    status!: ItemStatus; // changed from string
    photoKey!: string | null;
    createdAt!: string;
    updatedAt!: string;

    // Nested relations (we no longer keep the raw *Id fields here)
    gameSystem?: {
        id: string;
        name: string;
        slug?: string;
    };

    faction?: {
        id: string;
        name: string;
    };

    model?: {
        id: string;
        name: string;
        pointsCost?: number | null;
    } | null;

    colorScheme?: {
        id: string;
        name: string;
    } | null;

    project?: {
        id: string;
        name: string;
    } | null;

    // Compatibility getters for older code that expects *Id fields
    get gameSystemId(): string | undefined {
        return this.gameSystem?.id;
    }

    get factionId(): string | undefined {
        return this.faction?.id;
    }

    get modelId(): string | undefined | null {
        return this.model?.id ?? null;
    }

    get projectId(): string | undefined | null {
        return this.project?.id ?? null;
    }
}

export type ItemStatus = 'WANT' | 'BOUGHT' | 'ASSEMBLED' | 'WIP' | 'FINISHED';

export interface ItemPayload {
    name: string;
    gameSystemId: string;
    factionId: string;
    modelId?: string | null;
    points?: number | null;
    quantity?: number;
    purchaseDate?: string | null;
    price?: number | null;
    currency?: string;
    store?: string | null;
    notes?: string | null;
    tags?: string[];
    status?: ItemStatus;
    colorSchemeId?: string | null;
    projectId?: string | null;
    photoKey?: string | null;
}

export class ItemStatusHistory {
    id!: string;
    itemId!: string;
    fromStatus!: string;
    toStatus!: string;
    changedAt!: string;
}
