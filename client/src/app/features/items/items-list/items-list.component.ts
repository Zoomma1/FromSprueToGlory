// ──────────────────────────────────────────────────────────
// 📋 Items List Component — Table/Cards with CRUD + Inline Status
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Item } from '../../../classes/items';
import { ItemFormDialogComponent } from '../item-form/item-form-dialog.component';
import { ItemCardComponent } from '../item-card/item-card.component';
import {STATUS_ORDER, STATUS_LABELS} from '../../../classes/item.constants';

@Component({
    selector: 'app-items-list',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatButtonModule, MatIconModule,
        MatSelectModule, MatFormFieldModule,
        MatDialogModule, MatSnackBarModule, MatTooltipModule,
        ItemCardComponent,
    ],
    templateUrl: './items-list.component.html',
    styleUrl: './items-list.component.scss',
})
export class ItemsListComponent implements OnInit {
    private api = inject(ApiService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    items = signal<Item[]>([]);
    statusFilter = '';

    readonly statuses = STATUS_ORDER;
    readonly statusLabels = STATUS_LABELS;

    ngOnInit() {
        this.loadItems();
    }

    loadItems() {
        const filters: Record<string, string> = {};
        if (this.statusFilter) filters['status'] = this.statusFilter;
        this.api.getItems(filters).subscribe({
            next: (items) => this.items.set(items),
            error: () => {
                this.snackBar.open('Failed to load items', 'OK', { duration: 3000 });
            },
        });
    }

    // ─── Status helpers ───────────────────────────
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

    onStatusChange(event: { item: Item; direction: 'prev' | 'next' }) {
        if (event.direction === 'next') this.nextStatus(event.item);
        else this.prevStatus(event.item);
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

    duplicateItem(item: Item) {
        const existingNames = new Set(this.items().map(i => i.name));
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
                this.loadItems();
            },
            error: () => {
                this.snackBar.open('Failed to duplicate item', 'OK', { duration: 3000 });
            },
        });
    }

    deleteItem(item: Item) {
        if (!confirm(`Delete "${item.name}"?`)) return;
        this.api.deleteItem(item.id).subscribe({
            next: () => {
                this.snackBar.open('Item deleted', 'OK', { duration: 3000 });
                this.loadItems();
            },
            error: () => {
                this.snackBar.open('Failed to delete item', 'OK', { duration: 3000 });
            },
        });
    }
}
