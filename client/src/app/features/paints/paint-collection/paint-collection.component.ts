import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { PaintWithStatus, PaintFilter, PaintCollectionResult } from '../../../classes/paint';

@Component({
    selector: 'app-paint-collection',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
    templateUrl: './paint-collection.component.html',
    styleUrl: './paint-collection.component.scss',
})
export class PaintCollectionComponent implements OnInit, AfterViewInit, OnDestroy {
    private api = inject(ApiService);
    private snackBar = inject(MatSnackBar);
    private destroy$ = new Subject<void>();
    private searchSubject$ = new Subject<string>();

    @ViewChild('sentinel') sentinelRef!: ElementRef;
    private observer?: IntersectionObserver;

    paints = signal<PaintWithStatus[]>([]);
    counts = signal<PaintCollectionResult['counts']>({ owned: 0, need: 0, toBuy: 0, notOwned: 0 });
    activeFilter = signal<PaintFilter>(undefined);
    searchQuery = signal<string>('');
    loading = signal(false);
    loadingMore = signal(false);
    hasMore = signal(false);
    private currentPage = 1;
    private activeSearch = '';

    filteredPaints = this.paints;

    ngOnInit() {
        this.searchSubject$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$),
        ).subscribe(query => {
            this.activeSearch = query;
            this.loadCollection();
        });
        this.loadCollection();
    }

    onSearchChange(query: string) {
        this.searchQuery.set(query);
        this.searchSubject$.next(query);
    }

    ngAfterViewInit() {
        this.observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && this.hasMore() && !this.loadingMore() && !this.loading()) {
                this.loadNextPage();
            }
        });
        this.observer.observe(this.sentinelRef.nativeElement);
    }

    ngOnDestroy() {
        this.observer?.disconnect();
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadCollection() {
        this.loading.set(true);
        this.currentPage = 1;
        const search = this.activeSearch.trim() || undefined;
        this.api.getPaintCollection(this.activeFilter(), 1, search).subscribe({
            next: (result) => {
                this.paints.set(result.paints);
                this.counts.set(result.counts);
                this.hasMore.set(result.hasMore);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.snackBar.open('Failed to load paint collection', 'OK', { duration: 3000 });
            },
        });
    }

    private loadNextPage() {
        this.loadingMore.set(true);
        const next = this.currentPage + 1;
        const search = this.activeSearch.trim() || undefined;
        this.api.getPaintCollection(this.activeFilter(), next, search).subscribe({
            next: (result) => {
                this.paints.update(p => [...p, ...result.paints]);
                this.hasMore.set(result.hasMore);
                this.currentPage = next;
                this.loadingMore.set(false);
            },
            error: () => this.loadingMore.set(false),
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
