import { Component, inject, signal, computed, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Paint, PaintWithEquivalents } from '../../../classes/paint';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-paint-converter',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatFormFieldModule, MatInputModule, MatAutocompleteModule,
        MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatCheckboxModule, MatButtonModule,
    ],
    templateUrl: './paint-converter.component.html',
    styleUrl: './paint-converter.component.scss',
})
export class PaintConverterComponent implements OnInit, AfterViewInit, OnDestroy {
    private api = inject(ApiService);
    private destroyRef = inject(DestroyRef);
    private search$ = new Subject<string>();

    @ViewChild('sentinel') sentinelRef!: ElementRef;
    private observer?: IntersectionObserver;
    private currentPage = 1;

    allRows = signal<PaintWithEquivalents[]>([]);
    hasMore = signal(false);
    loadingMore = signal(false);
    searchQuery = signal('');
    selectedPaint = signal<Paint | null>(null);
    selectedRow = signal<PaintWithEquivalents | null>(null);
    filteredPaints = signal<Paint[]>([]);
    loading = signal(false);

    displayRows = computed(() => {
        const selected = this.selectedPaint();
        if (selected) {
            const row = this.selectedRow();
            return row ? [row] : [];
        }
        return this.allRows();
    });

    showCodes = signal(false);

    availableBrands = computed(() => {
        const brands = new Map<string, string>();
        for (const row of this.allRows()) {
            brands.set(row.brand.slug, row.brand.name);
            for (const eq of row.equivalents) brands.set(eq.brand.slug, eq.brand.name);
        }
        return Array.from(brands.entries()).map(([slug, name]) => ({ slug, name }));
    });

    visibleBrandSlugs = signal<string[]>([]);

    displayedBrands = computed(() =>
        this.availableBrands().filter((b) => this.visibleBrandSlugs().includes(b.slug)),
    );

    ngOnInit() {
        this.loadPage(1);

        this.search$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap((q) => (q.length >= 2 ? this.api.searchPaints(q) : of([]))),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((results) => this.filteredPaints.set(results));
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
    }

    private loadPage(page: number) {
        if (page === 1) this.loading.set(true);
        else this.loadingMore.set(true);

        firstValueFrom(this.api.getAllSimilarPaints(page))
            .then(({ data, hasMore }) => {
                if (page === 1) {
                    this.allRows.set(data);
                    const preferred = ['citadel', 'ak-interactive', 'army-painter', 'vallejo', 'green-stuff-world'];
                    const available = new Set(data.flatMap((r) => [r.brand.slug, ...r.equivalents.map((e) => e.brand.slug)]));
                    this.visibleBrandSlugs.set(preferred.filter((s) => available.has(s)));
                } else {
                    this.allRows.update((rows) => [...rows, ...data]);
                }
                this.hasMore.set(hasMore);
                this.currentPage = page;
            })
            .finally(() => {
                this.loading.set(false);
                this.loadingMore.set(false);
            });
    }

    private loadNextPage() {
        this.loadPage(this.currentPage + 1);
    }

    onSearchInput(value: string) {
        this.searchQuery.set(value);
        if (!value) {
            this.selectedPaint.set(null);
            this.selectedRow.set(null);
            this.filteredPaints.set([]);
        }
        this.search$.next(value);
    }

    selectPaint(paint: Paint) {
        this.selectedPaint.set(paint);
        this.selectedRow.set(null);
        this.searchQuery.set(paint.name);

        firstValueFrom(this.api.getSimilarPaints(paint.id)).then((similars) => {
            this.selectedRow.set({
                id: paint.id,
                name: paint.name,
                code: paint.code,
                brand: paint.brand,
                equivalents: similars,
            });
        });
    }

    displayPaintName(paint: Paint | null): string {
        return paint?.name ?? '';
    }

    toggleBrand(slug: string) {
        const current = this.visibleBrandSlugs();
        this.visibleBrandSlugs.set(
            current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
        );
    }

    isBrandVisible(slug: string): boolean {
        return this.visibleBrandSlugs().includes(slug);
    }

    getEquivalentForBrand(row: PaintWithEquivalents, brandSlug: string): { name: string; code: string | null } | undefined {
        if (brandSlug === row.brand.slug) return { name: row.name, code: row.code };
        return row.equivalents.find((e) => e.brand.slug === brandSlug);
    }

    toggleCodes() {
        this.showCodes.update((v) => !v);
    }
}
