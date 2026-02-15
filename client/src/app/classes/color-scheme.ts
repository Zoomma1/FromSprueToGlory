import { Technique } from './technique';
import { Paint } from './paint';

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
}

export interface ColorSchemeStepPayload {
    orderIndex: number;
    area: string;
    techniqueId: string;
    paintId?: string | null;
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
    notes?: string | null;
    technique?: Technique;
    paint?: Paint | null;
}

export type ColorSchemeFull = ColorScheme & {
    steps?: ColorSchemeStepFull[];
};
