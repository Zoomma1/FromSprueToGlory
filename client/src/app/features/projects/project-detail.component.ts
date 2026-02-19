// ──────────────────────────────────────────────────────────
// 📁 Project Detail Component — View project with items
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import { Project } from '../../classes/project';
import { Item } from '../../classes/items';
import { ItemFormDialogComponent } from '../items/item-form-dialog.component';

const STATUS_ORDER = ['WANT', 'BOUGHT', 'ASSEMBLED', 'WIP', 'FINISHED'] as const;
const STATUS_LABELS: Record<string, string> = {
    WANT: 'Want', BOUGHT: 'Bought', ASSEMBLED: 'Assembled', WIP: 'WIP', FINISHED: 'Finished',
};

@Component({
    selector: 'app-project-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule,
        MatMenuModule, MatSnackBarModule, MatDialogModule, MatTooltipModule,
        MatChipsModule,
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

    readonly statuses = STATUS_ORDER;
    readonly statusLabels = STATUS_LABELS;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.loadProject(id);
    }

    loadProject(id?: string) {
        const projectId = id || this.project()?.id;
        if (!projectId) return;
        this.api.getProject(projectId).subscribe({
            next: (p: Project) => {
                this.project.set(p);
            },
            error: (err) => {
                // Handle failed project load to avoid leaving the UI in a broken state
                console.error('Failed to load project', err);
                this.snackBar.open('Failed to load project details. Please try again.', 'Dismiss', {
                    duration: 5000,
                });
                this.router.navigate(['/projects']);
            },
        });
    }

    // ─── Status helpers ───────────────────────────
    getStatusLabel(status: string): string {
        return STATUS_LABELS[status] || status;
    }

    canAdvance(item: Item): boolean {
        return STATUS_ORDER.indexOf(item.status) < STATUS_ORDER.length - 1;
    }

    nextStatus(item: Item) {
        const idx = STATUS_ORDER.indexOf(item.status);
        if (idx < STATUS_ORDER.length - 1) {
            this.setStatus(item, STATUS_ORDER[idx + 1]);
        }
    }

    setStatus(item: Item, status: string) {
        if (item.status === status) return;
        this.api.changeItemStatus(item.id, status).subscribe({
            next: () => {
                this.snackBar.open(`Status → ${STATUS_LABELS[status]}`, 'OK', { duration: 2000 });
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
            this.api.getItems({ projectId: '' }).subscribe((items) => {
                // Filter to items not assigned to any project
                this.unassignedItems.set(items.filter((i: Item) => !i.projectId));
            });
        }
    }

    assignItem(itemId: string) {
        const projectId = this.project()?.id;
        if (!projectId) return;
        this.api.assignItemsToProject(projectId, [itemId]).subscribe(() => {
            this.snackBar.open('Item assigned', 'OK', { duration: 2000 });
            this.loadProject();
            this.unassignedItems.update((items) => items.filter((i) => i.id !== itemId));
        });
    }

    unassignItem(itemId: string) {
        const projectId = this.project()?.id;
        if (!projectId) return;
        this.api.unassignItemsFromProject(projectId, [itemId]).subscribe(() => {
            this.snackBar.open('Item removed from project', 'OK', { duration: 2000 });
            this.loadProject();
        });
    }

    goBack() {
        this.router.navigate(['/projects']);
    }

    // Item creation
    openCreateDialog() {
      const newItem = new Item();
      newItem.project = this.project() ? { id: this.project()!.id, name: this.project()!.name } : null;
      const dialogRef = this.dialog.open(ItemFormDialogComponent, {
        width: '600px', maxWidth: '95vw',
        data: { mode: 'edit', item: newItem },
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.loadProject();
        }
      });
    }
}
