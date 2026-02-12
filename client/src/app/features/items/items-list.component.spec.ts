// ──────────────────────────────────────────────────────────
// 🧪 Items List Component Tests
// ──────────────────────────────────────────────────────────

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ItemsListComponent } from './items-list.component';
import { ApiService } from '../../core/services/api.service';

describe('ItemsListComponent', () => {
    let component: ItemsListComponent;
    let fixture: ComponentFixture<ItemsListComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;

    const mockItems = [
        {
            id: '1', name: 'Intercessors', status: 'WANT', quantity: 5,
            faction: { name: 'Ultramarines' }, gameSystem: { name: '40K', slug: '40k' },
        },
        {
            id: '2', name: 'Ork Boyz', status: 'BOUGHT', quantity: 10,
            faction: { name: 'Orks' }, gameSystem: { name: '40K', slug: '40k' },
        },
    ];

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', ['getItems', 'deleteItem']);
        apiSpy.getItems.and.returnValue(of(mockItems));

        await TestBed.configureTestingModule({
            imports: [ItemsListComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: ApiService, useValue: apiSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call ApiService.getItems on init', () => {
        expect(apiSpy.getItems).toHaveBeenCalled();
    });

    it('should populate items signal after load', () => {
        expect(component.items().length).toBe(2);
        expect(component.items()[0].name).toBe('Intercessors');
    });

    it('should reload items when status filter changes', () => {
        apiSpy.getItems.calls.reset();
        component.statusFilter = 'BOUGHT';
        component.loadItems();

        expect(apiSpy.getItems).toHaveBeenCalledWith({ status: 'BOUGHT' });
    });
});
