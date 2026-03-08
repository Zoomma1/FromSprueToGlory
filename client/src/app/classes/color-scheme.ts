import { Technique } from './technique';
import { Paint } from './paint';
import { UserCustomPaint } from './user-custom-paint';

export class ColorSchemes {
    colorSchemes: ColorScheme[] = [];
}

export class ColorScheme {
    id!: string;
    userId!: string;
    name!: string;
    description!: string | null;
    referencePhotoKey!: string | null;
    createdAt!: string;
    updatedAt!: string;
    _count?: { steps: number; items: number };
}

export interface ColorSchemeStepPayload {
    orderIndex: number;
    area: string;
    techniqueId: string;
    paintId?: string | null;
    userCustomPaintId?: string | null;
    notes?: string | null;
}

export interface ColorSchemePayload {
    name: string;
    description?: string | null;
    steps: ColorSchemeStepPayload[];
}

export interface ColorSchemeStepFull {
    id?: string;
    orderIndex: number;
    area: string;
    techniqueId: string;
    paintId?: string | null;
    userCustomPaintId?: string | null;
    notes?: string | null;
    technique?: Technique;
    paint?: Paint | null;
    userCustomPaint?: UserCustomPaint | null;
}

export type ColorSchemeFull = ColorScheme & {
    steps?: ColorSchemeStepFull[];
};
