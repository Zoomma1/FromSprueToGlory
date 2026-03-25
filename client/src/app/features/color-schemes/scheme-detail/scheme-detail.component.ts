// ──────────────────────────────────────────────────────────
// 🎨 Scheme Detail Component — View/Edit Color Scheme
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ApiService } from '../../../core/services/api.service';
import { ColorSchemeFull, ColorSchemeStepPayload, ColorSchemeStepFull } from '../../../classes/color-scheme';
import { Technique } from '../../../classes/technique';
import { Paint } from '../../../classes/paint';
import { UserCustomPaint } from '../../../classes/user-custom-paint';
import { SearchableSelectComponent } from '../../../shared/searchable-select/searchable-select.component';

export const ADD_PAINT_SENTINEL = '__ADD_PAINT__';

export const PAINT_TYPES = [
    'BASE', 'LAYER', 'SHADE', 'DRY', 'CONTRAST', 'TECHNICAL',
    'AIR', 'METALLIC', 'INK', 'PRIMER', 'VARNISH', 'TEXTURE', 'OTHER',
];

@Component({
    selector: 'app-scheme-detail',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
        MatAutocompleteModule,
        MatSnackBarModule, MatTooltipModule, CdkDrag, CdkDropList,
        SearchableSelectComponent,
    ],
    templateUrl: './scheme-detail.component.html',
    styleUrl: './scheme-detail.component.scss',
})

export class SchemeDetailComponent implements OnInit {
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private fb = inject(FormBuilder);
    private snackBar = inject(MatSnackBar);
    private location = inject(Location);

    readonly ADD_PAINT_SENTINEL = ADD_PAINT_SENTINEL;
    readonly paintTypes = PAINT_TYPES;

    readonly techniqueDisplayFn = (t: Technique) => t.name;
    readonly brandDisplayFn = (b: string) => b;

    scheme = signal<ColorSchemeFull | null>(null);
    createMode = signal(false);
    editMode = signal(false);
    showDetails = signal(false);
    saving = signal(false);
    areaFilter = signal<string>('');
    paintFilter = signal<string>('');
    brandFilters = signal<Record<number, string>>({});

    /** Which step index currently has the "Add paint" form open (null = none) */
    addingPaintForStep = signal<number | null>(null);

    filteredSteps = computed(() => {
        const steps = this.scheme()?.steps || [];
        const filter = this.areaFilter();
        if (!filter) return steps;
        return steps.filter(s => s.area === filter);
    });

    techniques = signal<Technique[]>([]);
    paints = signal<Paint[]>([]);
    customPaints = signal<UserCustomPaint[]>([]);

    allPaints = computed((): Paint[] => {
        const custom: Paint[] = this.customPaints().map(cp => ({
            id: cp.id,
            name: cp.name,
            code: null,
            brandId: '',
            type: cp.type ?? 'OTHER',
            notes: cp.notes,
            brand: { name: 'Other', slug: 'other' },
            isCustom: true,
        }));
        return [...this.paints(), ...custom];
    });

    availableBrands = computed(() => {
        const brands = this.allPaints().map(p => p.brand?.name).filter(Boolean) as string[];
        const unique = Array.from(new Set(brands));
        const rest = unique.filter(b => b !== 'Other').sort();
        const hasOther = unique.includes('Other');
        return hasOther ? [...rest, 'Other'] : rest;
    });

    getDisplayedPaints(stepIndex: number): Paint[] {
        const nameFilter = this.paintFilter().toLowerCase();
        const brand = this.brandFilters()[stepIndex] ?? '';
        return this.allPaints().filter(p => {
            const matchesBrand = !brand || p.brand?.name === brand;
            const matchesName = !nameFilter || p.name.toLowerCase().includes(nameFilter);
            return matchesBrand && matchesName;
        });
    }

    getBrandFilter(stepIndex: number): string {
        return this.brandFilters()[stepIndex] ?? '';
    }

    getBrandFilterOrNull(stepIndex: number): string | null {
        return this.getBrandFilter(stepIndex) || null;
    }

    getTechniqueForStep(stepIndex: number): Technique | null {
        const id = this.stepsArray.at(stepIndex).get('techniqueId')?.value;
        return this.techniques().find(t => t.id === id) ?? null;
    }

    onTechniqueChange(technique: Technique | null, stepIndex: number): void {
        this.stepsArray.at(stepIndex).patchValue({ techniqueId: technique?.id ?? '' });
    }

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        steps: this.fb.array([]),
    });

    addPaintForm: FormGroup = this.fb.group({
        name: ['', Validators.required],
        type: [null as string | null],
        notes: [''],
    });

    get stepsArray(): FormArray {
        return this.form.get('steps') as FormArray;
    }

    ngOnInit() {
        const mode = this.route.snapshot.paramMap.get('mode');
        const id = this.route.snapshot.paramMap.get('id');
        const url = this.route.snapshot.url.map(s => s.path);
        const isNew = url.includes('new');

        if (isNew) {
            this.createMode.set(true);
            this.editMode.set(true);
            this.scheme.set({
                id: '', name: '', description: '', steps: [],
                userId: '', referencePhotoKey: '',
                createdAt: '', updatedAt: '',
            });
            this.loadReferenceData();
        } else if (mode === 'edit' && id) {
            this.api.getColorScheme(id).subscribe({
                next: (s) => {
                    this.scheme.set(s);
                    this.enterEditMode();
                },
                error: () => {
                    this.snackBar.open('Failed to load scheme', 'OK', { duration: 3000 });
                },
            });
        } else if (id) {
            this.loadScheme(id);
        }
    }

    loadScheme(id?: string) {
        const schemeId = id || this.scheme()?.id;
        if (!schemeId) return;
        this.api.getColorScheme(schemeId).subscribe({
            next: (s) => this.scheme.set(s),
            error: () => {
                this.snackBar.open('Failed to load scheme', 'OK', { duration: 3000 });
            },
        });
    }

    // ─── View Mode ────────────────────────────────
    toggleDetails() {
        this.showDetails.update((v) => !v);
    }

    get availableAreas(): string[] {
      const allAreas = this.scheme()?.steps?.map(s => s.area) || [];
      return Array.from(new Set(allAreas));
    }

    setAreaFilter(area: string) {
        this.areaFilter.set(area);
    }

    resetAreaFilter() {
        this.areaFilter.set('');
    }

    // ─── Edit Mode ────────────────────────────────
    enterEditMode() {
        const s = this.scheme();
        if (!s) return;

        this.loadReferenceData();

        this.form.patchValue({ name: s.name, description: s.description });
        this.stepsArray.clear();
        for (const step of s.steps || []) {
            this.stepsArray.push(this.createStepGroup(step));
        }
        this.editMode.set(true);
    }

    private loadReferenceData() {
        this.api.getTechniques().subscribe({
            next: (t) => this.techniques.set(t),
            error: () => {
                this.snackBar.open('Failed to load techniques', 'OK', { duration: 3000 });
            },
        });
        this.api.getPaints().subscribe({
            next: (p) => this.paints.set(p),
            error: () => {
                this.snackBar.open('Failed to load paints', 'OK', { duration: 3000 });
            },
        });
        this.api.getUserCustomPaints().subscribe({
            next: (p) => this.customPaints.set(p),
            error: () => {
                this.snackBar.open('Failed to load custom paints', 'OK', { duration: 3000 });
            },
        });
    }

    cancelEdit() {
        if (this.createMode()) {
            this.router.navigate(['/color-schemes']);
        } else {
            this.editMode.set(false);
        }
    }

    displayPaintName = (paintId: string | null): string => {
        if (!paintId) return '';
        const paint = this.allPaints().find(p => p.id === paintId);
        return paint ? paint.name : '';
    };

    onPaintSelected(value: string | null, stepIndex: number) {
        if (value === ADD_PAINT_SENTINEL) {
            this.openAddPaintForm(stepIndex);
            this.stepsArray.at(stepIndex).patchValue({ paintId: null });
            return;
        }
        this.stepsArray.at(stepIndex).patchValue({ paintId: value });
        this.paintFilter.set('');
    }

    onPaintInput(value: string) {
        this.paintFilter.set(value);
    }

    onBrandFilterChange(brand: string | null, stepIndex: number) {
        this.brandFilters.update(filters => ({ ...filters, [stepIndex]: brand ?? '' }));
    }

    clearPaint(stepIndex: number) {
        this.stepsArray.at(stepIndex).patchValue({ paintId: null });
        this.paintFilter.set('');
    }

    // ─── Custom Paint Form ────────────────────────
    openAddPaintForm(stepIndex: number) {
        this.addPaintForm.reset({ name: '', type: null, notes: '' });
        this.addingPaintForStep.set(stepIndex);
    }

    cancelAddPaint() {
        this.addPaintForm.reset({ name: '', type: null, notes: '' });
        this.addingPaintForStep.set(null);
    }

    submitCustomPaint(stepIndex: number) {
        if (this.addPaintForm.invalid) return;

        const { name, type, notes } = this.addPaintForm.value as { name: string; type: string | null; notes: string };

        this.api.createUserCustomPaint({ name, type: type || null, notes: notes || null }).subscribe({
            next: (created) => {
                this.customPaints.update(paints => [created, ...paints]);
                this.stepsArray.at(stepIndex).patchValue({ paintId: created.id });
                this.paintFilter.set('');
                this.addingPaintForStep.set(null);
                this.addPaintForm.reset({ name: '', type: null, notes: '' });
                this.snackBar.open(`"${created.name}" added!`, 'OK', { duration: 3000 });
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed to add paint', 'OK', { duration: 5000 });
            },
        });
    }

    addStep() {
        this.stepsArray.push(this.createStepGroup());
    }

    removeStep(index: number) {
        this.stepsArray.removeAt(index);
    }

    reorderStep(event: CdkDragDrop<unknown>) {
        const controls = [...this.stepsArray.controls];
        const [moved] = controls.splice(event.previousIndex, 1);
        controls.splice(event.currentIndex, 0, moved);
        this.stepsArray.clear();
        controls.forEach((c) => this.stepsArray.push(c));
    }

    private createStepGroup(step?: ColorSchemeStepPayload): FormGroup {
        const paintId = step?.paintId || step?.userCustomPaintId || null;
        return this.fb.group({
            area: [step?.area || '', Validators.required],
            techniqueId: [step?.techniqueId || '', Validators.required],
            paintId: [paintId],
            notes: [step?.notes || ''],
        });
    }

    save() {
        if (this.form.invalid || this.stepsArray.length === 0) return;
        this.saving.set(true);

        interface StepFormValue { area: string; techniqueId: string; paintId?: string | null; notes?: string | null }

        const customPaintIds = new Set(this.customPaints().map(p => p.id));

        const value: { name: string; description?: string | null; steps: ColorSchemeStepPayload[] } = {
            name: this.form.value.name,
            description: this.form.value.description,
            steps: this.form.value.steps.map((s: StepFormValue, i: number) => {
                const isCustom = !!s.paintId && customPaintIds.has(s.paintId);
                return {
                    orderIndex: i + 1,
                    area: s.area,
                    techniqueId: s.techniqueId,
                    paintId: isCustom ? null : (s.paintId || null),
                    userCustomPaintId: isCustom ? s.paintId : null,
                    notes: s.notes || null,
                };
            }),
        };

        const obs = this.createMode()
            ? this.api.createColorScheme(value)
            : this.api.updateColorScheme(this.scheme()!.id, value);

        obs.subscribe({
            next: (result) => {
                this.snackBar.open('Saved!', 'OK', { duration: 3000 });
                if (this.createMode()) {
                    this.router.navigate(['/color-schemes', 'view', result.id]);
                } else {
                    this.editMode.set(false);
                    this.saving.set(false);
                    this.loadScheme();
                }
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed', 'OK', { duration: 5000 });
                this.saving.set(false);
            },
        });
    }

    duplicate() {
        const s = this.scheme();
        if (!s) return;
        const data: { name: string; description?: string | null; steps: ColorSchemeStepPayload[] } = {
            name: `${s.name} (copy)`,
            description: s.description,
            steps: (s.steps || []).map((step: ColorSchemeStepFull, i: number) => {
                const techniqueId = step.techniqueId || step.technique?.id;
                return {
                    orderIndex: i + 1,
                    area: step.area,
                    techniqueId: techniqueId || '',
                    paintId: step.paintId || step.paint?.id || null,
                    userCustomPaintId: step.userCustomPaintId || step.userCustomPaint?.id || null,
                    notes: step.notes || null,
                };
            }),
        };
        this.api.createColorScheme(data).subscribe({
            next: (created) => {
                this.snackBar.open('Duplicated!', 'OK', { duration: 3000 });
                this.router.navigate(['/color-schemes', 'view', created.id]);
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed', 'OK', { duration: 5000 });
            },
        });
    }

    deleteScheme() {
        if (!confirm(`Delete "${this.scheme()?.name}"?`)) return;
        this.api.deleteColorScheme(this.scheme()!.id).subscribe(() => {
            this.snackBar.open('Deleted', 'OK', { duration: 3000 });
            this.router.navigate(['/color-schemes']);
        });
    }

    hasUnsavedChanges(): boolean {
        if (!this.editMode()) return false;
        return this.form.dirty;
    }

    goBack() {
        if (this.hasUnsavedChanges() && !confirm('You have unsaved changes. Leave without saving?')) {
            return;
        }
        this.location.back();
    }
}
