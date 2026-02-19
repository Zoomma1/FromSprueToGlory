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
import { GameSystem } from '../../classes/game-system';
import { Faction } from '../../classes/factions';
import { Model } from '../../classes/model';
import { Project } from '../../classes/project';
import { ItemPayload } from '../../classes/items';

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

    gameSystems = signal<GameSystem[]>([]);
    factions = signal<Faction[]>([]);
    models = signal<Model[]>([]);
    projects = signal<Project[]>([]);
    saving = signal(false);

    private editSavedIds: { gameSystemId?: string; factionId?: string; modelId?: string; projectId?: string } | null = null;

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        gameSystem: [null, Validators.required], // will hold object {id,name}
        faction: [null, Validators.required],
        model: [null],
        status: ['WANT'],
        quantity: [1, [Validators.required, Validators.min(1)]],
        price: [null],
        currency: ['EUR'],
        store: [''],
        notes: [''],
        project: [null],
    });

    ngOnInit() {
        this.api.getGameSystems().subscribe((gs) => {
            this.gameSystems.set(gs);
            // if editing, resolve saved gameSystemId to object and trigger cascade
            if (this.editSavedIds?.gameSystemId) {
                const gsObj = gs.find((g: GameSystem) => g.id === this.editSavedIds!.gameSystemId);
                if (gsObj) {
                    this.form.patchValue({ gameSystem: gsObj });
                    // trigger faction load
                    this.onGameSystemChange(gsObj.id);
                }
            }
        });

        this.api.getProjects().subscribe((p) => {
            this.projects.set(p);
            if (this.editSavedIds?.projectId) {
                const proj = p.find((x: Project) => x.id === this.editSavedIds!.projectId);
                if (proj) this.form.patchValue({ project: proj });
            } else if (this.data.mode === 'create' && this.data.defaultProjectId) {
                const proj = p.find((x: Project) => x.id === this.data.defaultProjectId);
                if (proj) this.form.patchValue({ project: proj });
            }
        });

        if (this.data.mode === 'edit' && this.data.item) {
            const item = this.data.item;

            this.editSavedIds = {
                gameSystemId: item.gameSystemId,
                factionId: item.factionId,
                modelId: item.modelId,
                projectId: item.projectId,
            };

            this.form.patchValue({
                name: item.name,
                status: item.status,
                quantity: item.quantity,
                price: item.price,
                currency: item.currency,
                store: item.store,
                notes: item.notes,
            });

            const gsList = this.gameSystems();
            if (gsList && gsList.length && item.gameSystemId) {
                const gsObj = gsList.find((g: GameSystem) => g.id === item.gameSystemId);
                if (gsObj) {
                    this.form.patchValue({ gameSystem: gsObj });
                    this.onGameSystemChange(gsObj.id);
                }
            }

            // projects
            const projList = this.projects();
            if (projList && projList.length && item.projectId) {
                const proj = projList.find((x: Project) => x.id === item.projectId);
                if (proj) this.form.patchValue({ project: proj });
            }
        }
    }

    onGameSystemChange(gameSystemId: string) {
        this.api.getFactions(gameSystemId).subscribe((f) => {
            this.factions.set(f);
            // if editing and have saved faction id, resolve it
            if (this.editSavedIds?.factionId) {
                const fac = f.find((x: Faction) => x.id === this.editSavedIds!.factionId);
                if (fac) {
                    this.form.patchValue({ faction: fac });
                    // trigger models load for faction
                    this.onFactionChange(fac.id);
                }
                // clear saved faction id so we don't try again
                this.editSavedIds!.factionId = undefined;
            }
        });
        this.form.patchValue({ faction: null, model: null });
        this.models.set([]);
    }

    onFactionChange(factionId: string) {
        this.api.getModels(factionId).subscribe((m) => {
            this.models.set(m);
            // resolve saved model id if present
            if (this.editSavedIds?.modelId) {
                const modelObj = m.find((x: Model) => x.id === this.editSavedIds!.modelId);
                if (modelObj) this.form.patchValue({ model: modelObj });
                this.editSavedIds!.modelId = undefined;
            }
        });
        this.form.patchValue({ model: null });
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);

        const v = this.form.value;

        // Build payload expected by backend (ids, not nested objects)
        const payload: ItemPayload = {
            name: v.name,
            gameSystemId: v.gameSystem?.id,
            factionId: v.faction?.id,
            modelId: v.model?.id ?? null,
            status: v.status,
            quantity: v.quantity,
            price: v.price,
            currency: v.currency,
            store: v.store,
            notes: v.notes,
            projectId: v.project?.id ?? null,
        };

        const obs = this.data.mode === 'create'
            ? this.api.createItem(payload)
            : this.api.updateItem(this.data.item.id, payload);

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
