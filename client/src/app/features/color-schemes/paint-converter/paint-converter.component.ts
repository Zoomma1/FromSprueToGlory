import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
export class PaintConverterComponent implements OnInit {
    private api = inject(ApiService);

    allPaints = signal<Paint[]>([]);
    allRows = signal<PaintWithEquivalents[]>([]);
    searchQuery = signal('');
    selectedPaint = signal<Paint | null>(null);
    loading = signal(false);

    // Rows to display: all by default, filtered to the selected paint when one is chosen
    displayRows = computed(() => {
        const selected = this.selectedPaint();
        return selected ? this.allRows().filter((r) => r.id === selected.id) : this.allRows();
    });

    showCodes = signal(false);

    // All unique brands across all rows — includes the source paint's brand
    availableBrands = computed(() => {
        const brands = new Map<string, string>();
        for (const row of this.allRows()) {
            brands.set(row.brand.slug, row.brand.name);
            for (const eq of row.equivalents) {
                brands.set(eq.brand.slug, eq.brand.name);
            }
        }
        return Array.from(brands.entries()).map(([slug, name]) => ({ slug, name }));
    });

    // User-selected visible brand columns
    visibleBrandSlugs = signal<string[]>([]);

    // Filtered autocomplete options
    filteredPaints = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        if (q.length < 2) return [];
        return this.allPaints()
            .filter((p) => p.name.toLowerCase().includes(q))
            .slice(0, 20);
    });

    // Displayed brand columns (intersection of available and visible)
    displayedBrands = computed(() =>
        this.availableBrands().filter((b) => this.visibleBrandSlugs().includes(b.slug)),
    );

    ngOnInit() {
        this.loading.set(true);
        firstValueFrom(this.api.getAllSimilarPaints())
            .then((rows) => {
                this.allRows.set(rows);
                const brands = [...new Set(rows.flatMap((r) => r.equivalents.map((e) => e.brand.slug)))];
                this.visibleBrandSlugs.set(brands);
            })
            .finally(() => this.loading.set(false));
        this.api.getPaints().subscribe((paints) => this.allPaints.set(paints));
    }

    onSearchInput(value: string) {
        this.searchQuery.set(value);
        if (!value) {
            this.selectedPaint.set(null);
        }
    }

    selectPaint(paint: Paint) {
        this.selectedPaint.set(paint);
        this.searchQuery.set(paint.name);
    }

    displayPaintName(paint: Paint | null): string {
        return paint?.name ?? '';
    }

    toggleBrand(slug: string) {
        const current = this.visibleBrandSlugs();
        if (current.includes(slug)) {
            this.visibleBrandSlugs.set(current.filter((s) => s !== slug));
        } else {
            this.visibleBrandSlugs.set([...current, slug]);
        }
    }

    isBrandVisible(slug: string): boolean {
        return this.visibleBrandSlugs().includes(slug);
    }

    getEquivalentForBrand(row: PaintWithEquivalents, brandSlug: string): { name: string; code: string | null } | undefined {
        if (brandSlug === row.brand.slug) {
            return { name: row.name, code: row.code };
        }
        return row.equivalents.find((e) => e.brand.slug === brandSlug);
    }

    toggleCodes() {
        this.showCodes.update((v) => !v);
    }
}
