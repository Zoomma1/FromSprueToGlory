import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/services/api.service';
import { PaintWithStatus, PaintFilter, PaintCollectionResult } from '../../../classes/paint';

@Component({
    selector: 'app-paint-collection',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
    templateUrl: './paint-collection.component.html',
    styleUrl: './paint-collection.component.scss',
})
export class PaintCollectionComponent implements OnInit {
    private api = inject(ApiService);
    private snackBar = inject(MatSnackBar);

    paints = signal<PaintWithStatus[]>([]);
    counts = signal<PaintCollectionResult['counts']>({ owned: 0, need: 0, toBuy: 0, notOwned: 0 });
    activeFilter = signal<PaintFilter>(undefined);
    searchQuery = signal<string>('');
    loading = signal(false);

    filteredPaints = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return this.paints();
        return this.paints().filter(p =>
            p.name.toLowerCase().includes(query) || p.brand.name.toLowerCase().includes(query),
        );
    });

    ngOnInit() {
        this.loadCollection();
    }

    loadCollection() {
        this.loading.set(true);
        this.api.getPaintCollection(this.activeFilter()).subscribe({
            next: (result) => {
                this.paints.set(result.paints);
                this.counts.set(result.counts);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.snackBar.open('Failed to load paint collection', 'OK', { duration: 3000 });
            },
        });
    }

    setFilter(filter: PaintFilter) {
        this.activeFilter.set(filter);
        this.loadCollection();
    }

    markAsOwned(paintId: string) {
        this.api.markPaintAsOwned(paintId).subscribe({
            next: () => this.loadCollection(),
            error: () => this.snackBar.open('Failed to update collection', 'OK', { duration: 3000 }),
        });
    }

    removeFromOwned(paintId: string) {
        this.api.removePaintFromOwned(paintId).subscribe({
            next: () => this.loadCollection(),
            error: () => this.snackBar.open('Failed to update collection', 'OK', { duration: 3000 }),
        });
    }

    addToWishlist(paintId: string) {
        this.api.addPaintToWishlist(paintId).subscribe({
            next: () => this.loadCollection(),
            error: () => this.snackBar.open('Failed to update wishlist', 'OK', { duration: 3000 }),
        });
    }

    removeFromWishlist(paintId: string) {
        this.api.removePaintFromWishlist(paintId).subscribe({
            next: () => this.loadCollection(),
            error: () => this.snackBar.open('Failed to update wishlist', 'OK', { duration: 3000 }),
        });
    }

    joinNames(items: { id: string; name: string }[]): string {
        return items.map(i => i.name).join(', ');
    }
}
