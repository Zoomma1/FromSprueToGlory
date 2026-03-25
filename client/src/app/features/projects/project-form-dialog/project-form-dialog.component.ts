// ──────────────────────────────────────────────────────────
// 📝 Project Form Dialog — Create/Edit project
// ──────────────────────────────────────────────────────────
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-project-form-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule, MatSnackBarModule,
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

    form: FormGroup = this.fb.group({
        name: [this.data.project?.name || '', Validators.required],
        description: [this.data.project?.description || ''],
    });

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        const obs = this.data.mode === 'create'
            ? this.api.createProject(this.form.value)
            : this.api.updateProject(this.data.project.id, this.form.value);

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
