// ──────────────────────────────────────────────────────────
// 🎨 Scheme Detail Component — View/Edit Color Scheme
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { ColorSchemeFull, ColorSchemeStepPayload, ColorSchemeStepFull } from '../../classes/color-scheme';
import { Technique } from '../../classes/technique';
import { Paint } from '../../classes/paint';

@Component({
    selector: 'app-scheme-detail',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatSnackBarModule, MatTooltipModule, CdkDrag, CdkDropList,
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

    scheme = signal<ColorSchemeFull | null>(null);
    editMode = signal(false);
    showDetails = signal(false);
    saving = signal(false);

    techniques = signal<Technique[]>([]);
    paints = signal<Paint[]>([]);

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        steps: this.fb.array([]),
    });

    get stepsArray(): FormArray {
        return this.form.get('steps') as FormArray;
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.loadScheme(id);
    }

    loadScheme(id?: string) {
        const schemeId = id || this.scheme()?.id;
        if (!schemeId) return;
        this.api.getColorScheme(schemeId).subscribe((s) => this.scheme.set(s));
    }

    // ─── View Mode ────────────────────────────────
    toggleDetails() {
        this.showDetails.update((v) => !v);
    }

    // ─── Edit Mode ────────────────────────────────
    enterEditMode() {
        const s = this.scheme();
        if (!s) return;

        // Load reference data
        this.api.getTechniques().subscribe((t) => this.techniques.set(t));
        this.api.getPaints().subscribe((p) => this.paints.set(p));

        // Populate form
        this.form.patchValue({ name: s.name, description: s.description });
        this.stepsArray.clear();
        for (const step of s.steps || []) {
            this.stepsArray.push(this.createStepGroup(step));
        }
        this.editMode.set(true);
    }

    cancelEdit() {
        this.editMode.set(false);
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
        return this.fb.group({
            area: [step?.area || '', Validators.required],
            techniqueId: [step?.techniqueId || '', Validators.required],
            paintId: [step?.paintId || null],
            notes: [step?.notes || ''],
        });
    }

    save() {
        if (this.form.invalid || this.stepsArray.length === 0) return;
        this.saving.set(true);

        interface StepFormValue { area: string; techniqueId: string; paintId?: string | null; notes?: string | null }

        const value: { name: string; description?: string | null; steps: ColorSchemeStepPayload[] } = {
            name: this.form.value.name,
            description: this.form.value.description,
            steps: this.form.value.steps.map((s: StepFormValue, i: number) => ({
                orderIndex: i + 1,
                area: s.area,
                techniqueId: s.techniqueId,
                paintId: s.paintId || null,
                notes: s.notes || null,
            })),
        };

        this.api.updateColorScheme(this.scheme()!.id, value).subscribe({
            next: () => {
                this.snackBar.open('Saved!', 'OK', { duration: 3000 });
                this.editMode.set(false);
                this.saving.set(false);
                this.loadScheme();
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
                    notes: step.notes || null,
                };
            }),
        };
        this.api.createColorScheme(data).subscribe({
            next: (created) => {
                this.snackBar.open('Duplicated!', 'OK', { duration: 3000 });
                this.router.navigate(['/color-schemes', created.id]);
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

    goBack() {
        this.router.navigate(['/color-schemes']);
    }
}
