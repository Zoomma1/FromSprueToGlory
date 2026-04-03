// ──────────────────────────────────────────────────────────
// 📝 Project Form Dialog — Create/Edit project
// ──────────────────────────────────────────────────────────
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-project-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatSnackBarModule,
        MatChipsModule,
    ],
    templateUrl: './project-form-dialog.component.html',
    styleUrls: ['./project-form-dialog.component.scss'],
})
export class ProjectFormDialogComponent {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private dialogRef = inject(MatDialogRef<ProjectFormDialogComponent>);
    private snackBar = inject(MatSnackBar);
    data = inject(MAT_DIALOG_DATA);

    saving = signal(false);
    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    form: FormGroup = this.fb.group({
        name: [this.data.project?.name || '', Validators.required],
        description: [this.data.project?.description || ''],
        color: [this.data.project?.color || null],
        tags: [this.data.project?.tags ?? ([] as string[])],
    });

    tags = toSignal(
        this.form.get('tags')!.valueChanges as Observable<string[]>,
        { initialValue: this.data.project?.tags ?? [] as string[] },
    );

    addTag(tag: string) {
        if (tag.trim().length === 0) return;
        const current = this.tags();
        if (current.includes(tag.trim())) return;
        this.form.patchValue({ tags: [...current, tag.trim()] });
    }

    removeTag(tag: string) {
        this.form.patchValue({ tags: this.tags().filter((t: string) => t !== tag) });
    }

    onTagInput(event: MatChipInputEvent) {
        this.addTag(event.value);
        event.chipInput.clear();
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);

        const value = this.form.value;
        const payload = {
            ...value,
            tags: value.tags?.map((t: string) => t.trim()).filter((t: string) => t.length > 0) ?? [],
            color: value.color || null,
        };

        const obs = this.data.mode === 'create'
            ? this.api.createProject(payload)
            : this.api.updateProject(this.data.project.id, payload);

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
