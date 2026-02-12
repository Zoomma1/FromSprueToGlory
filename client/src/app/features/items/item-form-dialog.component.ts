// ──────────────────────────────────────────────────────────
// 📝 Item Form Dialog — Create / Edit item
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
    selector: 'app-item-form-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatDatepickerModule, MatNativeDateModule,
        MatChipsModule, MatIconModule, MatSnackBarModule,
    ],
    templateUrl: './item-form-dialog.component.html',
    styleUrl: './item-form-dialog.component.scss',
})
export class ItemFormDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private dialogRef = inject(MatDialogRef<ItemFormDialogComponent>);
    private snackBar = inject(MatSnackBar);
    data = inject(MAT_DIALOG_DATA);

    gameSystems = signal<any[]>([]);
    factions = signal<any[]>([]);
    models = signal<any[]>([]);
    projects = signal<any[]>([]);
    saving = signal(false);

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        gameSystemId: ['', Validators.required],
        factionId: ['', Validators.required],
        modelId: [null],
        status: ['WANT'],
        quantity: [1, [Validators.required, Validators.min(1)]],
        price: [null],
        currency: ['EUR'],
        store: [''],
        notes: [''],
        projectId: [null],
    });

    ngOnInit() {
        this.api.getGameSystems().subscribe((gs) => this.gameSystems.set(gs));
        this.api.getProjects().subscribe((p) => this.projects.set(p));

        if (this.data.mode === 'edit' && this.data.item) {
            const item = this.data.item;
            this.form.patchValue({
                name: item.name,
                gameSystemId: item.gameSystemId,
                factionId: item.factionId,
                modelId: item.modelId,
                status: item.status,
                quantity: item.quantity,
                price: item.price,
                currency: item.currency,
                store: item.store,
                notes: item.notes,
                projectId: item.projectId,
            });

            // Load cascading data
            if (item.gameSystemId) this.onGameSystemChange(item.gameSystemId);
            if (item.factionId) this.onFactionChange(item.factionId);
        }
    }

    onGameSystemChange(gameSystemId: string) {
        this.api.getFactions(gameSystemId).subscribe((f) => this.factions.set(f));
        this.form.patchValue({ factionId: '', modelId: null });
        this.models.set([]);
    }

    onFactionChange(factionId: string) {
        this.api.getModels(factionId).subscribe((m) => this.models.set(m));
        this.form.patchValue({ modelId: null });
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);

        const value = this.form.value;
        const obs = this.data.mode === 'create'
            ? this.api.createItem(value)
            : this.api.updateItem(this.data.item.id, value);

        obs.subscribe({
            next: () => {
                this.snackBar.open(
                    this.data.mode === 'create' ? 'Item created!' : 'Item updated!',
                    'OK', { duration: 3000 },
                );
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed to save', 'OK', { duration: 5000 });
                this.saving.set(false);
            },
        });
    }
}
