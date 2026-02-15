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
import { Item } from '../../classes/items';

describe('ItemsListComponent', () => {
    let component: ItemsListComponent;
    let fixture: ComponentFixture<ItemsListComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;

  const mockItems: Item[] = [
    {
      id: '1',
      userId: 'user1',
      name: 'Intercessors',
      status: 'WANT',
      quantity: 5,
      points: 100,
      purchaseDate: null,
      price: null,
      currency: 'USD',
      store: null,
      notes: null,
      tags: [],
      photoKey: null,
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
      factionId: '1',
      faction: { id: '1', name: 'Ultramarines' },
      gameSystemId: '1',
      gameSystem: { id: '1', name: '40K', slug: '40k' },
      modelId: null,
      model: null,
      colorScheme: null,
      projectId: null,
      project: null,
    },
    {
      id: '2',
      userId: 'user1',
      name: 'Ork Boyz',
      status: 'BOUGHT',
      quantity: 10,
      points: 80,
      purchaseDate: null,
      price: null,
      currency: 'USD',
      store: null,
      notes: null,
      tags: [],
      photoKey: null,
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
      factionId: '2',
      faction: { id: '2', name: 'Orks' },
      gameSystemId: '1',
      gameSystem: { id: '1', name: '40K', slug: '40k' },
      modelId: null,
      model: null,
      colorScheme: null,
      projectId: null,
      project: null,
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
