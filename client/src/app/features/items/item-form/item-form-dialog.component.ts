// ──────────────────────────────────────────────────────────
// 📝 Item Form Dialog — Create / Edit item
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { SearchableSelectComponent } from '../../../shared/searchable-select/searchable-select.component';
import { GameSystem } from '../../../classes/game-system';
import { Faction } from '../../../classes/factions';
import { Model } from '../../../classes/model';
import { Project } from '../../../classes/project';
import { ItemPayload } from '../../../classes/items';
import {ITEM_STATUSES, CURRENCIES} from '../../../classes/item.constants';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

@Component({
    selector: 'app-item-form-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatChipsModule,
        SearchableSelectComponent,
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

  readonly gameSystemDisplayFn = (gs: GameSystem) => gs.name;
    readonly factionDisplayFn = (f: Faction) => f.name;
    readonly projectDisplayFn = (p: Project) => p.name;

    private editSavedIds: { gameSystemId?: string; factionId?: string; modelId?: string; projectId?: string } | null = null;

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        gameSystem: [null, Validators.required],
        faction: [null, Validators.required],
        status: ['WANT'],
        quantity: [1, [Validators.required, Validators.min(1)]],
        price: [null],
        currency: ['EUR'],
        notes: [''],
        project: [null],
        tags: [[] as string[]],
    });

    tags = toSignal(
      this.form.get('tags')!.valueChanges as Observable<string[]>,
      { initialValue: [] as string[] }
    );

    ngOnInit() {
        this.api.getGameSystems().subscribe({
            next: (gs) => {
                this.gameSystems.set(gs);
                if (this.editSavedIds?.gameSystemId) {
                    const gsObj = gs.find((g: GameSystem) => g.id === this.editSavedIds!.gameSystemId);
                    if (gsObj) {
                        this.form.patchValue({ gameSystem: gsObj });
                        this.onGameSystemChange(gsObj.id);
                    }
                }
            },
            error: () => {
                this.snackBar.open('Failed to load game systems', 'OK', { duration: 3000 });
            },
        });

        if (this.data.mode === 'create') {
            this.api.getMe().subscribe({
                next: (profile) => this.form.patchValue({ currency: profile.currency }),
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                error: () => {},
            });
        }

        this.api.getProjects().subscribe({
            next: (p) => {
                this.projects.set(p);
                if (this.editSavedIds?.projectId) {
                    const proj = p.find((x: Project) => x.id === this.editSavedIds!.projectId);
                    if (proj) this.form.patchValue({ project: proj });
                } else if (this.data.mode === 'create' && this.data.defaultProjectId) {
                    const proj = p.find((x: Project) => x.id === this.data.defaultProjectId);
                    if (proj) this.form.patchValue({ project: proj });
                }
            },
            error: () => {
                this.snackBar.open('Failed to load projects', 'OK', { duration: 3000 });
            },
        });

        if (this.data.mode === 'create' && (this.data.defaultGameSystemId || this.data.defaultFactionId)) {
            this.editSavedIds = {
                gameSystemId: this.data.defaultGameSystemId ?? undefined,
                factionId: this.data.defaultFactionId ?? undefined,
            };
        }

        if (this.data.mode === 'edit' && this.data.item) {
            const item = this.data.item;

            this.editSavedIds = {
                gameSystemId: item.gameSystemId,
                factionId: item.factionId,
                projectId: item.projectId,
            };

            this.form.patchValue({
                name: item.name,
                status: item.status,
                quantity: item.quantity,
                price: item.price,
                currency: item.currency,
                notes: item.notes,
                tags: item.tags,
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

    addTag(tag: string) {
        if (tag.trim().length === 0) return;
        const currentTags = this.tags();
        if (currentTags.includes(tag)) return;
        this.form.patchValue({ tags: [...currentTags, tag] });
    }

    removeTag(tag: string) {
        this.form.patchValue({ tags: this.tags().filter(t => t !== tag) });
    }

    onGameSystemChange(gameSystemId: string) {
        this.form.patchValue({ faction: null, model: null });
        this.models.set([]);
        this.api.getFactions(gameSystemId).subscribe({
            next: (f) => {
                this.factions.set(f);
                if (this.editSavedIds?.factionId) {
                    const fac = f.find((x: Faction) => x.id === this.editSavedIds!.factionId);
                    if (fac) {
                        this.form.patchValue({ faction: fac });
                        this.onFactionChange(fac.id);
                    }
                    this.editSavedIds!.factionId = undefined;
                }
            },
            error: () => {
                this.snackBar.open('Failed to load factions', 'OK', { duration: 3000 });
            },
        });
    }

    onFactionChange(factionId: string) {
        this.form.patchValue({ model: null });
        this.api.getModels(factionId).subscribe({
            next: (m) => {
                this.models.set(m);
                if (this.editSavedIds?.modelId) {
                    const modelObj = m.find((x: Model) => x.id === this.editSavedIds!.modelId);
                    if (modelObj) this.form.patchValue({ model: modelObj });
                    this.editSavedIds!.modelId = undefined;
                }
            },
            error: () => {
                this.snackBar.open('Failed to load models', 'OK', { duration: 3000 });
            },
        });
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
            status: v.status,
            quantity: v.quantity,
            price: v.price,
            currency: v.currency,
            notes: v.notes,
            projectId: v.project?.id ?? null,
            tags: v.tags?.map((x: string) => x.trim()).filter((x: string) => x.length > 0) || [],
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

    onTagInput(event: MatChipInputEvent) {
        this.addTag(event.value);
        event.chipInput!.clear();
    }

    protected readonly ITEM_STATUSES = ITEM_STATUSES;
    protected readonly CURRENCIES = CURRENCIES;
    protected readonly separatorKeyCodes = [ENTER, COMMA] as const;
}
