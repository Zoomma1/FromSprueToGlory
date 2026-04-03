import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Paint } from '../../../../classes/paint';
import { SearchableSelectComponent } from '../../../../shared/searchable-select/searchable-select.component';

@Component({
    selector: 'app-step-mix-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, SearchableSelectComponent],
    templateUrl: './step-mix-editor.component.html',
    styleUrl: './step-mix-editor.component.scss',
})
export class StepMixEditorComponent {
    private fb = inject(FormBuilder);

    mixArray = input.required<FormArray>();
    allPaints = input.required<Paint[]>();
    ratioMode = input.required<'percent' | 'drops'>();

    ratioModeChange = output<'percent' | 'drops'>();

    /** Per-entry brand filter */
    private entryBrandFilters = signal<Record<number, string>>({});

    readonly paintDisplayFn = (p: Paint): string =>
        `${p.brand?.name ? p.brand.name + ' — ' : ''}${p.name}`;

    readonly brandDisplayFn = (b: string): string => b;

    readonly availableBrands = computed((): string[] => {
        const brands = this.allPaints().map(p => p.brand?.name).filter(Boolean) as string[];
        const unique = Array.from(new Set(brands));
        const rest = unique.filter(b => b !== 'Other').sort();
        return unique.includes('Other') ? [...rest, 'Other'] : rest;
    });

    get entries(): FormGroup[] {
        return this.mixArray().controls as FormGroup[];
    }

    getFilteredPaintsForEntry(entryIndex: number): Paint[] {
        const brand = this.entryBrandFilters()[entryIndex] ?? '';
        if (!brand) return this.allPaints();
        return this.allPaints().filter(p => p.brand?.name === brand);
    }

    getBrandFilterOrNull(entryIndex: number): string | null {
        return this.entryBrandFilters()[entryIndex] || null;
    }

    onBrandFilterChange(brand: string | null, entryIndex: number): void {
        this.entryBrandFilters.update(f => ({ ...f, [entryIndex]: brand ?? '' }));
    }

    getPaintForEntry(entryGroup: FormGroup): Paint | null {
        const paintId = entryGroup.get('paintId')?.value as string | null;
        if (!paintId) return null;
        return this.allPaints().find(p => p.id === paintId) ?? null;
    }

    onPaintChange(paint: Paint | null, entryGroup: FormGroup): void {
        entryGroup.patchValue({ paintId: paint?.id ?? null });
    }

    toggleRatioMode(): void {
        this.ratioModeChange.emit(this.ratioMode() === 'percent' ? 'drops' : 'percent');
    }

    addEntry(): void {
        this.mixArray().push(this.fb.group({ paintId: [null], ratio: [null] }));
    }

    removeEntry(index: number): void {
        this.entryBrandFilters.update(f => {
            const next = { ...f };
            delete next[index];
            // Shift filters above the removed index down by one
            return Object.fromEntries(
                Object.entries(next).map(([k, v]) => [+k > index ? +k - 1 : +k, v])
            );
        });
        this.mixArray().removeAt(index);
    }
}
