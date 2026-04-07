// ──────────────────────────────────────────────────────────
// 📁 Project Detail Component — View project with items
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Project } from '../../../classes/project';
import { Item } from '../../../classes/items';
import { STATUS_ORDER, STATUS_LABELS } from '../../../classes/item.constants';
import { ItemCardComponent } from '../../items/item-card/item-card.component';
import { ItemFormDialogComponent } from '../../items/item-form/item-form-dialog.component';

@Component({
    selector: 'app-project-detail',
    standalone: true,
    imports: [
        CommonModule, CurrencyPipe, FormsModule,
        MatButtonModule, MatIconModule,
        MatSelectModule, MatFormFieldModule,
        MatSnackBarModule, MatDialogModule, MatTooltipModule,
        ItemCardComponent,
    ],
    templateUrl: './project-detail.component.html',
    styleUrl: './project-detail.component.scss',
})
export class ProjectDetailComponent implements OnInit {
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    project = signal<Project | null>(null);
    unassignedItems = signal<Item[]>([]);
    showAssignPanel = signal(false);

    sortOption = signal<'name-asc' | 'name-desc' | 'status-asc' | 'status-desc'>('name-asc');

    sortedItems = computed(() => {
        const items = this.project()?.items ?? [];
        const [field, dir] = this.sortOption().split('-') as ['name' | 'status', 'asc' | 'desc'];
        return [...items].sort((a, b) => {
            const cmp = field === 'name'
                ? a.name.localeCompare(b.name)
                : STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
            return dir === 'asc' ? cmp : -cmp;
        });
    });

    toSpendSummary = computed(() => {
        const wantItems = this.project()?.items?.filter((i) => i.status === 'WANT') ?? [];
        if (!wantItems.length) return null;
        const withPrice = wantItems.filter((i) => i.price != null);
        const total = withPrice.reduce((sum, i) => sum + i.price!, 0);
        const missing = wantItems.length - withPrice.length;
        return { total, missing };
    });

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.loadProject(id);
    }

    loadProject(id?: string) {
        const projectId = id || this.project()?.id;
        if (!projectId) return;
        this.api.getProject(projectId).subscribe({
            next: (p: Project) => this.project.set(p),
            error: (err) => {
                console.error('Failed to load project', err);
                this.snackBar.open('Failed to load project details. Please try again.', 'Dismiss', {
                    duration: 5000,
                });
                this.router.navigate(['/projects']);
            },
        });
    }

    // ─── Status ───────────────────────────────────
    onStatusChange(event: { item: Item; direction: 'prev' | 'next' }) {
        const idx = STATUS_ORDER.indexOf(event.item.status);
        const newStatus = event.direction === 'next' ? STATUS_ORDER[idx + 1] : STATUS_ORDER[idx - 1];
        if (!newStatus) return;
        this.api.changeItemStatus(event.item.id, newStatus).subscribe({
            next: () => {
                this.snackBar.open(`Status → ${STATUS_LABELS[newStatus]}`, 'OK', { duration: 2000 });
                this.loadProject();
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed', 'OK', { duration: 3000 });
            },
        });
    }

    // ─── Assign/Unassign ──────────────────────────
    toggleAssignPanel() {
        this.showAssignPanel.update((v) => !v);
        if (this.showAssignPanel()) {
            this.api.getItems({ projectId: '' }).subscribe({
                next: (items) => {
                    this.unassignedItems.set(items.filter((i: Item) => !i.projectId));
                },
                error: () => {
                    this.snackBar.open('Failed to load unassigned items', 'OK', { duration: 3000 });
                },
            });
        }
    }

    assignItem(itemId: string) {
        const projectId = this.project()?.id;
        if (!projectId) return;
        this.api.assignItemsToProject(projectId, [itemId]).subscribe({
            next: () => {
                this.snackBar.open('Item assigned', 'OK', { duration: 2000 });
                this.loadProject();
                this.unassignedItems.update((items) => items.filter((i) => i.id !== itemId));
            },
            error: () => {
                this.snackBar.open('Failed to assign item', 'OK', { duration: 3000 });
            },
        });
    }

    unassignItem(itemId: string) {
        const projectId = this.project()?.id;
        if (!projectId) return;
        this.api.unassignItemsFromProject(projectId, [itemId]).subscribe({
            next: () => {
                this.snackBar.open('Item removed from project', 'OK', { duration: 2000 });
                this.loadProject();
            },
            error: () => {
                this.snackBar.open('Failed to remove item', 'OK', { duration: 3000 });
            },
        });
    }

    goBack() {
        this.router.navigate(['/projects']);
    }

    duplicateItem(item: Item) {
        const existingNames = new Set((this.project()?.items ?? []).map((i: Item) => i.name));
        let n = 2;
        while (existingNames.has(`${item.name} (${n})`)) n++;
        const name = `${item.name} (${n})`;

        if (!confirm(`Duplicate "${item.name}" as "${name}"?`)) return;

        this.api.createItem({
            name,
            gameSystemId: item.gameSystemId!,
            factionId: item.factionId!,
            status: 'WANT',
            quantity: item.quantity,
            price: item.price,
            currency: item.currency,
            notes: item.notes,
            projectId: item.projectId,
            tags: [...item.tags],
        }).subscribe({
            next: () => {
                this.snackBar.open(`"${name}" created`, 'OK', { duration: 2000 });
                this.loadProject();
            },
            error: () => {
                this.snackBar.open('Failed to duplicate item', 'OK', { duration: 3000 });
            },
        });
    }

    openEditDialog(item: Item) {
        const dialogRef = this.dialog.open(ItemFormDialogComponent, {
            width: '600px', maxWidth: '95vw',
            data: { mode: 'edit', item },
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) this.loadProject();
        });
    }

    openCreateDialog() {
        const project = this.project();
        const dialogRef = this.dialog.open(ItemFormDialogComponent, {
            width: '600px', maxWidth: '95vw',
            data: {
                mode: 'create',
                defaultProjectId: project?.id ?? null,
                defaultProjectName: project?.name ?? null,
                defaultGameSystemId: project?.defaultGameSystemId ?? null,
                defaultFactionId: project?.defaultFactionId ?? null,
            },
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) this.loadProject();
        });
    }
}
