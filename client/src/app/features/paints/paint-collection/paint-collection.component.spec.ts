import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PaintCollectionComponent } from './paint-collection.component';
import { ApiService } from '../../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaintCollectionResult } from '../../../classes/paint';

const mockResult: PaintCollectionResult = {
    paints: [
        { id: 'p-1', name: 'Abaddon Black', hex: null, type: 'BASE', code: null, brand: { id: 'b-1', name: 'Citadel', slug: 'citadel' }, status: 'owned' },
        { id: 'p-2', name: 'Mephiston Red', hex: '#A30000', type: 'BASE', code: null, brand: { id: 'b-1', name: 'Citadel', slug: 'citadel' }, status: 'need', neededForSchemes: [{ id: 's-1', name: 'Blood Angels' }] },
        { id: 'p-3', name: 'Agrax Earthshade', hex: null, type: 'SHADE', code: null, brand: { id: 'b-1', name: 'Citadel', slug: 'citadel' }, status: 'notOwned' },
    ],
    counts: { owned: 1, need: 1, toBuy: 1, notOwned: 1 },
    hasMore: false,
};

describe('PaintCollectionComponent', () => {
    let component: PaintCollectionComponent;
    let fixture: ComponentFixture<PaintCollectionComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', [
            'getPaintCollection', 'markPaintAsOwned', 'removePaintFromOwned',
            'addPaintToWishlist', 'removePaintFromWishlist',
        ]);
        apiSpy.getPaintCollection.and.returnValue(of(mockResult));
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [PaintCollectionComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: ApiService, useValue: apiSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
            ],
        }).overrideComponent(PaintCollectionComponent, {
            add: { providers: [
                { provide: ApiService, useValue: apiSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
            ]},
        }).compileComponents();

        fixture = TestBed.createComponent(PaintCollectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => expect(component).toBeTruthy());

    it('should load collection on init', () => {
        expect(apiSpy.getPaintCollection).toHaveBeenCalledWith(undefined, 1, undefined);
        expect(component.paints().length).toBe(3);
        expect(component.counts()).toEqual(mockResult.counts);
    });

    it('should reload with filter when setFilter is called', () => {
        apiSpy.getPaintCollection.calls.reset();
        apiSpy.getPaintCollection.and.returnValue(of({ paints: [], counts: { owned: 0, need: 0, toBuy: 0, notOwned: 0 }, hasMore: false }));

        component.setFilter('owned');

        expect(component.activeFilter()).toBe('owned');
        expect(apiSpy.getPaintCollection).toHaveBeenCalledWith('owned', 1, undefined);
    });

    it('should mark paint as owned and reload', () => {
        apiSpy.markPaintAsOwned.and.returnValue(of({ paintId: 'p-3' }));
        apiSpy.getPaintCollection.calls.reset();

        component.markAsOwned('p-3');

        expect(apiSpy.markPaintAsOwned).toHaveBeenCalledWith('p-3');
        expect(apiSpy.getPaintCollection).toHaveBeenCalledTimes(1);
    });

    it('should remove from owned and reload', () => {
        apiSpy.removePaintFromOwned.and.returnValue(of(undefined));
        apiSpy.getPaintCollection.calls.reset();

        component.removeFromOwned('p-1');

        expect(apiSpy.removePaintFromOwned).toHaveBeenCalledWith('p-1');
        expect(apiSpy.getPaintCollection).toHaveBeenCalledTimes(1);
    });

    it('should add to wishlist and reload', () => {
        apiSpy.addPaintToWishlist.and.returnValue(of({ paintId: 'p-3' }));
        apiSpy.getPaintCollection.calls.reset();

        component.addToWishlist('p-3');

        expect(apiSpy.addPaintToWishlist).toHaveBeenCalledWith('p-3');
        expect(apiSpy.getPaintCollection).toHaveBeenCalledTimes(1);
    });

    it('should show error snackbar when load fails', () => {
        apiSpy.getPaintCollection.and.returnValue(throwError(() => new Error('fail')));
        component.loadCollection();
        expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load paint collection', 'OK', { duration: 3000 });
    });

    it('should call API with search param after debounce', fakeAsync(() => {
        apiSpy.getPaintCollection.calls.reset();
        const searchResult: PaintCollectionResult = {
            paints: [mockResult.paints[1]],
            counts: mockResult.counts,
            hasMore: false,
        };
        apiSpy.getPaintCollection.and.returnValue(of(searchResult));

        component.onSearchChange('mephi');
        tick(300);

        expect(apiSpy.getPaintCollection).toHaveBeenCalledWith(undefined, 1, 'mephi');
        expect(component.paints().length).toBe(1);
        expect(component.paints()[0].name).toBe('Mephiston Red');
    }));

    it('filteredPaints returns all paints when search is empty', () => {
        component.searchQuery.set('');
        expect(component.filteredPaints().length).toBe(3);
    });
});
