// ──────────────────────────────────────────────────────────
// 📋 Items List Component — Table/Cards with CRUD + Inline Status
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Item } from '../../classes/items';
import { ItemFormDialogComponent } from './item-form-dialog.component';

const STATUS_ORDER = ['WANT', 'BOUGHT', 'ASSEMBLED', 'WIP', 'FINISHED'] as const;
const STATUS_LABELS: Record<string, string> = {
    WANT: 'Want', BOUGHT: 'Bought', ASSEMBLED: 'Assembled', WIP: 'WIP', FINISHED: 'Finished',
};

@Component({
    selector: 'app-items-list',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatTableModule, MatCardModule, MatButtonModule, MatIconModule,
        MatChipsModule, MatSelectModule, MatFormFieldModule, MatMenuModule,
        MatDialogModule, MatSnackBarModule, MatTooltipModule,
    ],
    templateUrl: './items-list.component.html',
    styleUrl: './items-list.component.scss',
})
export class ItemsListComponent implements OnInit {
    private api = inject(ApiService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private breakpointObserver = inject(BreakpointObserver);

    items = signal<Item[]>([]);
    isMobile = signal(false);
    statusFilter = '';
    displayedColumns = ['name', 'faction', 'status', 'quantity', 'actions'];

    readonly statuses = STATUS_ORDER;
    readonly statusLabels = STATUS_LABELS;

    ngOnInit() {
        this.breakpointObserver.observe([Breakpoints.Handset]).subscribe((result) => {
            this.isMobile.set(result.matches);
        });
        this.loadItems();
    }

    loadItems() {
        const filters: Record<string, string> = {};
        if (this.statusFilter) filters['status'] = this.statusFilter;
        this.api.getItems(filters).subscribe((items) => this.items.set(items));
    }

    // ─── Status helpers ───────────────────────────
    getStatusLabel(status: string): string {
        return STATUS_LABELS[status] || status;
    }

    canAdvance(item: Item): boolean {
        return STATUS_ORDER.indexOf(item.status) < STATUS_ORDER.length - 1;
    }

    canRevert(item: Item): boolean {
        return STATUS_ORDER.indexOf(item.status) > 0;
    }

    nextStatus(item: Item) {
        const idx = STATUS_ORDER.indexOf(item.status);
        if (idx < STATUS_ORDER.length - 1) {
            this.setStatus(item, STATUS_ORDER[idx + 1]);
        }
    }

    prevStatus(item: Item) {
        const idx = STATUS_ORDER.indexOf(item.status);
        if (idx > 0) {
            this.setStatus(item, STATUS_ORDER[idx - 1]);
        }
    }

    setStatus(item: Item, status: string) {
        if (item.status === status) return;
        this.api.changeItemStatus(item.id, status).subscribe({
            next: () => {
                this.snackBar.open(`Status → ${STATUS_LABELS[status]}`, 'OK', { duration: 2000 });
                this.loadItems();
            },
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed to change status', 'OK', { duration: 3000 });
            },
        });
    }

    // ─── CRUD ─────────────────────────────────────
    openCreateDialog() {
        const dialogRef = this.dialog.open(ItemFormDialogComponent, {
            width: '600px', maxWidth: '95vw',
            data: { mode: 'create' },
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) this.loadItems();
        });
    }

    openEditDialog(item: Item) {
        const dialogRef = this.dialog.open(ItemFormDialogComponent, {
            width: '600px', maxWidth: '95vw',
            data: { mode: 'edit', item },
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) this.loadItems();
        });
    }

    deleteItem(item: Item) {
        if (!confirm(`Delete "${item.name}"?`)) return;
        this.api.deleteItem(item.id).subscribe(() => {
            this.snackBar.open('Item deleted', 'OK', { duration: 3000 });
            this.loadItems();
        });
    }
}
