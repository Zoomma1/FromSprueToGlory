// ──────────────────────────────────────────────────────────
// 📝 Project Form Dialog — Create/Edit project
// ──────────────────────────────────────────────────────────
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
    selector: 'app-project-form-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatSnackBarModule,
    ],
    template: `
        <h2 mat-dialog-title>{{ data.mode === 'create' ? 'New Project' : 'Edit Project' }}</h2>
        <mat-dialog-content>
            <form [formGroup]="form">
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Name</mat-label>
                    <input matInput formControlName="name">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea matInput formControlName="description" rows="3"></textarea>
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button mat-dialog-close>Cancel</button>
            <button mat-raised-button color="primary" (click)="save()"
                [disabled]="form.invalid || saving()">
                {{ data.mode === 'create' ? 'Create' : 'Save' }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [`
      mat-dialog-content {
        max-height: 75vh;
        overflow-y: auto;
        overflow-x: visible;
        padding-top: 12px !important;
      }
      .full-width {
        width: 100%;
    }`],
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
