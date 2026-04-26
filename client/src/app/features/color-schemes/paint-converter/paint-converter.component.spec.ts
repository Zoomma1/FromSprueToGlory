import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PaintConverterComponent } from './paint-converter.component';
import { ApiService } from '../../../core/services/api.service';
import { Paint, PaintWithEquivalents } from '../../../classes/paint';

const mockCitadelBlue: Paint = {
    id: 'p-1', name: 'Macragge Blue', code: null,
    brandId: 'b-1', type: 'BASE', notes: null,
    brand: { name: 'Citadel', slug: 'citadel' },
};

const mockRows: PaintWithEquivalents[] = [
    {
        id: 'p-1', name: 'Macragge Blue', code: null,
        brand: { name: 'Citadel', slug: 'citadel' },
        equivalents: [
            { id: 'p-2', name: 'Game Color Magic Blue', type: 'BASE', code: '72.021', source: 'redgrimm', distance: null, brand: { id: 'b-2', name: 'Vallejo', slug: 'vallejo' } },
            { id: 'p-3', name: 'Electric Blue', type: 'BASE', code: 'WP1010', source: 'redgrimm', distance: null, brand: { id: 'b-3', name: 'Army Painter', slug: 'army-painter' } },
        ],
    },
    {
        id: 'p-4', name: 'White Scar', code: null,
        brand: { name: 'Citadel', slug: 'citadel' },
        equivalents: [
            { id: 'p-5', name: 'Dead White', type: 'BASE', code: '72.001', source: 'redgrimm', distance: null, brand: { id: 'b-2', name: 'Vallejo', slug: 'vallejo' } },
        ],
    },
];

describe('PaintConverterComponent', () => {
    let component: PaintConverterComponent;
    let fixture: ComponentFixture<PaintConverterComponent>;
    let apiService: jasmine.SpyObj<ApiService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ApiService', ['getAllSimilarPaints', 'searchPaints', 'getSimilarPaints']);
        spy.getAllSimilarPaints.and.returnValue(of({ data: mockRows, hasMore: false }));
        spy.searchPaints.and.returnValue(of([]));
        spy.getSimilarPaints.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [PaintConverterComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ApiService, useValue: spy },
            ],
        }).compileComponents();

        apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
        fixture = TestBed.createComponent(PaintConverterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('loads all rows on init', () => {
        expect(apiService.getAllSimilarPaints).toHaveBeenCalled();
        expect(component.allRows().length).toBe(2);
    });

    it('displays all rows by default when no paint is selected', () => {
        expect(component.selectedPaint()).toBeNull();
        expect(component.displayRows().length).toBe(2);
    });

    it('filters rows to the selected paint', async () => {
        component.selectPaint(mockCitadelBlue);
        await fixture.whenStable();
        expect(component.displayRows().length).toBe(1);
        expect(component.displayRows()[0].id).toBe('p-1');
    });

    it('restores all rows when search is cleared', async () => {
        component.selectPaint(mockCitadelBlue);
        await fixture.whenStable();
        component.onSearchInput('');
        expect(component.selectedPaint()).toBeNull();
        expect(component.displayRows().length).toBe(2);
    });

    it('filters paints by backend search (min 2 chars, debounced)', fakeAsync(() => {
        apiService.searchPaints.and.returnValue(of([mockCitadelBlue]));

        component.onSearchInput('m');
        tick(300);
        expect(component.filteredPaints().length).toBe(0); // <2 chars → of([])

        component.onSearchInput('ma');
        tick(300);
        expect(component.filteredPaints().length).toBe(1);
        expect(component.filteredPaints()[0].name).toBe('Macragge Blue');
    }));

    it('exposes available brands from all rows', () => {
        const slugs = component.availableBrands().map((b) => b.slug);
        expect(slugs).toContain('vallejo');
        expect(slugs).toContain('army-painter');
    });

    it('shows preferred brands checked by default', () => {
        expect(component.visibleBrandSlugs()).toContain('vallejo');
        expect(component.visibleBrandSlugs()).toContain('army-painter');
    });

    it('toggleBrand hides a visible brand', () => {
        component.toggleBrand('vallejo');
        expect(component.visibleBrandSlugs()).not.toContain('vallejo');
    });

    it('toggleBrand shows a hidden brand', () => {
        component.toggleBrand('vallejo');
        component.toggleBrand('vallejo');
        expect(component.visibleBrandSlugs()).toContain('vallejo');
    });

    it('getEquivalentForBrand returns the correct equivalent', () => {
        const row = component.allRows()[0];
        const result = component.getEquivalentForBrand(row, 'vallejo');
        expect(result?.name).toBe('Game Color Magic Blue');
    });

    it('getEquivalentForBrand returns the source paint for its own brand', () => {
        const row = component.allRows()[0];
        const result = component.getEquivalentForBrand(row, 'citadel');
        expect(result?.name).toBe('Macragge Blue');
    });

    it('getEquivalentForBrand returns undefined for unknown brand', () => {
        const row = component.allRows()[0];
        expect(component.getEquivalentForBrand(row, 'scale75')).toBeUndefined();
    });

    it('availableBrands includes the source paint brand', () => {
        const slugs = component.availableBrands().map((b) => b.slug);
        expect(slugs).toContain('citadel');
    });

    it('showCodes defaults to false and toggleCodes flips it', () => {
        expect(component.showCodes()).toBeFalse();
        component.toggleCodes();
        expect(component.showCodes()).toBeTrue();
        component.toggleCodes();
        expect(component.showCodes()).toBeFalse();
    });
});
