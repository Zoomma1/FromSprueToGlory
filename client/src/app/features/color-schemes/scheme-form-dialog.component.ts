// ──────────────────────────────────────────────────────────
// 🎨 Scheme Form Dialog — Create/Edit with step builder
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { Technique } from '../../classes/technique';
import { Paint } from '../../classes/paint';
import { ColorSchemePayload, ColorSchemeStepPayload } from '../../classes/color-scheme';

@Component({
    selector: 'app-scheme-form-dialog',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule,
        MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatIconModule, MatSnackBarModule, CdkDrag, CdkDropList,
    ],
    templateUrl: './scheme-form-dialog.component.html',
    styleUrl: './scheme-form-dialog.component.scss',
})
export class SchemeFormDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private dialogRef = inject(MatDialogRef<SchemeFormDialogComponent>);
    private snackBar = inject(MatSnackBar);
    data = inject(MAT_DIALOG_DATA);

    techniques = signal<Technique[]>([]);
    paints = signal<Paint[]>([]);
    saving = signal(false);

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        steps: this.fb.array([]),
    });

    get stepsArray(): FormArray {
        return this.form.get('steps') as FormArray;
    }

    ngOnInit() {
        this.api.getTechniques().subscribe((t) => this.techniques.set(t));
        this.api.getPaints().subscribe((p) => this.paints.set(p));

        if (this.data.mode === 'edit' && this.data.scheme) {
            this.form.patchValue({
                name: this.data.scheme.name,
                description: this.data.scheme.description,
            });
            for (const step of this.data.scheme.steps || []) {
                this.stepsArray.push(this.createStepGroup(step));
            }
        }
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
            techniqueId: [step?.techniqueId || step?.techniqueId || '', Validators.required],
            paintId: [step?.paintId || null],
            notes: [step?.notes || ''],
        });
    }

    save() {
        if (this.form.invalid || this.stepsArray.length === 0) return;
        this.saving.set(true);

        interface StepFormValue { area: string; techniqueId: string; paintId?: string | null; notes?: string | null }

        const value: ColorSchemePayload = {
            name: this.form.value.name,
            description: this.form.value.description,
            steps: this.form.value.steps.map((s: StepFormValue, i: number): ColorSchemeStepPayload => ({
                orderIndex: i + 1,
                area: s.area,
                techniqueId: s.techniqueId,
                paintId: s.paintId || null,
                notes: s.notes || null,
            })),
        };

        const obs = this.data.mode === 'create'
            ? this.api.createColorScheme(value)
            : this.api.updateColorScheme(this.data.scheme.id, value);

        obs.subscribe({
            next: () => {
                this.snackBar.open('Saved!', 'OK', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed', 'OK', { duration: 5000 });
                this.saving.set(false);
            },
        });
    }
}
