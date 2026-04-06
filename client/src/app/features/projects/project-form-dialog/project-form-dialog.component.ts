// ──────────────────────────────────────────────────────────
// 📝 Project Form Dialog — Create/Edit project
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
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
import { GameSystem } from '../../../classes/game-system';
import { Faction } from '../../../classes/factions';
import { SearchableSelectComponent } from '../../../shared/searchable-select/searchable-select.component';

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
        SearchableSelectComponent,
    ],
    templateUrl: './project-form-dialog.component.html',
    styleUrls: ['./project-form-dialog.component.scss'],
})
export class ProjectFormDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private dialogRef = inject(MatDialogRef<ProjectFormDialogComponent>);
    private snackBar = inject(MatSnackBar);
    data = inject(MAT_DIALOG_DATA);

    saving = signal(false);
    gameSystems = signal<GameSystem[]>([]);
    factions = signal<Faction[]>([]);
    readonly separatorKeysCodes = [ENTER, COMMA] as const;
    readonly gameSystemDisplayFn = (gs: GameSystem) => gs?.name ?? '';
    readonly factionDisplayFn = (f: Faction) => f?.name ?? '';

    form: FormGroup = this.fb.group({
        name: [this.data.project?.name || '', Validators.required],
        description: [this.data.project?.description || ''],
        color: [this.data.project?.color || null],
        tags: [this.data.project?.tags ?? ([] as string[])],
        gameSystem: [null],
        faction: [null],
    });

    tags = toSignal(
        this.form.get('tags')!.valueChanges as Observable<string[]>,
        { initialValue: this.data.project?.tags ?? [] as string[] },
    );

    ngOnInit() {
        this.api.getGameSystems().subscribe({
            next: (gs) => {
                this.gameSystems.set(gs);
                const savedId = this.data.project?.defaultGameSystemId;
                if (savedId) {
                    const gsObj = gs.find((g: GameSystem) => g.id === savedId);
                    if (gsObj) {
                        this.form.patchValue({ gameSystem: gsObj });
                        this.onGameSystemChange(gsObj.id, this.data.project?.defaultFactionId);
                    }
                }
            },
            error: () => this.snackBar.open('Failed to load game systems', 'OK', { duration: 3000 }),
        });
    }

    onGameSystemChange(gameSystemId: string | null, preselectFactionId?: string | null) {
        this.form.patchValue({ faction: null });
        this.factions.set([]);
        if (!gameSystemId) return;
        this.api.getFactions(gameSystemId).subscribe({
            next: (f) => {
                this.factions.set(f);
                if (preselectFactionId) {
                    const fac = f.find((x: Faction) => x.id === preselectFactionId);
                    if (fac) this.form.patchValue({ faction: fac });
                }
            },
            error: () => this.snackBar.open('Failed to load factions', 'OK', { duration: 3000 }),
        });
    }

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
            name: value.name,
            description: value.description,
            color: value.color || null,
            tags: value.tags?.map((t: string) => t.trim()).filter((t: string) => t.length > 0) ?? [],
            defaultGameSystemId: value.gameSystem?.id ?? null,
            defaultFactionId: value.faction?.id ?? null,
        };

        const obs = this.data.mode === 'create'
            ? this.api.createProject(payload as never)
            : this.api.updateProject(this.data.project.id, payload as never);

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
