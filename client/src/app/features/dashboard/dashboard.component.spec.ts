import { DashboardComponent } from './dashboard.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Item } from '../../classes/items';

describe('Dashboard', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockItems: Item[] = [
    { id: '1', name: 'Item 1', status: 'WANT' } as Item,
    { id: '2', name: 'Item 2', status: 'WIP' } as Item,
    { id: '3', name: 'Item 3', status: 'FINISHED' } as Item,
  ];

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getItems']);
    apiSpy.getItems.and.returnValue(of(mockItems));

    await TestBed.configureTestingModule({
      imports: [ DashboardComponent ],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy }
      ]
    }).overrideComponent((DashboardComponent), {
      set: {
        providers: [
          { provide: ApiService, useValue: apiSpy }
        ]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create the dashboard component', () => {
      expect(component).toBeTruthy();
    });

    it('should call ApiService.getData on init', () => {
      expect(apiSpy.getItems).toHaveBeenCalled();
    });
  });

  describe('Stats Calculation', () => {
    it('should calculate stats correctly based on item statuses', () => {
      const expectedStats = [
        { status: 'WANT', count: 1, icon: 'shopping_cart', color: '#2196f3' },
        { status: 'BOUGHT', count: 0, icon: 'local_shipping', color: '#ff9800' },
        { status: 'ASSEMBLED', count: 0, icon: 'build', color: '#9c27b0' },
        { status: 'WIP', count: 1, icon: 'brush', color: '#f44336' },
        { status: 'FINISHED', count: 1, icon: 'check_circle', color: '#4caf50' },
      ];

      expect(component.stats()).toEqual(expectedStats);
    });

    it('should calculate total items correctly', () => {
      expect(component.totalItems()).toBe(3);
    });

    it('should handle empty item list', () => {
      apiSpy.getItems.and.returnValue(of([]));
      component.ngOnInit();
      expect(component.stats()).toEqual([
        { status: 'WANT', count: 0, icon: 'shopping_cart', color: '#2196f3' },
        { status: 'BOUGHT', count: 0, icon: 'local_shipping', color: '#ff9800' },
        { status: 'ASSEMBLED', count: 0, icon: 'build', color: '#9c27b0' },
        { status: 'WIP', count: 0, icon: 'brush', color: '#f44336' },
        { status: 'FINISHED', count: 0, icon: 'check_circle', color: '#4caf50' },
      ]);
      expect(component.totalItems()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should reset stats and totalItems when getItems fails', () => {
      apiSpy.getItems.and.returnValue(throwError(() => new Error('API error')));
      component.ngOnInit();
      expect(component.stats()).toEqual([]);
      expect(component.totalItems()).toBe(0);
    });
  });

  describe('Wasted money', () => {
    const makeItem = (overrides: Partial<Item>): Item =>
      ({ id: '0', name: 'Item', status: 'WIP', price: null, currency: 'EUR', project: null, ...overrides }) as Item;

    const reloadWith = (items: Item[]) => {
      apiSpy.getItems.and.returnValue(of(items));
      component.ngOnInit();
    };

    it('should return null when no items are eligible', () => {
      reloadWith([]);
      expect(component.wastedMoney()).toBeNull();
    });

    it('should return null when all items are WANT or FINISHED', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WANT', price: 30, currency: 'EUR' }),
        makeItem({ id: '2', status: 'FINISHED', price: 20, currency: 'EUR' }),
      ]);
      expect(component.wastedMoney()).toBeNull();
    });

    it('should return null when eligible items have no price', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WIP', price: null, currency: 'EUR' }),
        makeItem({ id: '2', status: 'BOUGHT', price: null, currency: 'EUR' }),
      ]);
      expect(component.wastedMoney()).toBeNull();
    });

    it('should compute a single currency breakdown correctly', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WIP', price: 30, currency: 'EUR' }),
        makeItem({ id: '2', status: 'BOUGHT', price: 20, currency: 'EUR' }),
        makeItem({ id: '3', status: 'FINISHED', price: 50, currency: 'EUR' }), // excluded
        makeItem({ id: '4', status: 'WANT', price: 10, currency: 'EUR' }),    // excluded
        makeItem({ id: '5', status: 'ASSEMBLED', price: null, currency: 'EUR' }), // excluded (no price)
      ]);
      const result = component.wastedMoney();
      expect(result).not.toBeNull();
      expect(result!.breakdown).toEqual([{ currency: 'EUR', amount: 50 }]);
    });

    it('should list all currencies in breakdown', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WIP', price: 30, currency: 'EUR' }),
        makeItem({ id: '2', status: 'WIP', price: 20, currency: 'EUR' }),
        makeItem({ id: '3', status: 'WIP', price: 15, currency: 'GBP' }),
      ]);
      const result = component.wastedMoney();
      expect(result!.breakdown).toEqual(
        jasmine.arrayWithExactContents([
          { currency: 'EUR', amount: 50 },
          { currency: 'GBP', amount: 15 },
        ]),
      );
    });

    it('should group items by project in projectBreakdown', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WIP', price: 20, currency: 'EUR', project: { id: 'p1', name: 'Project Alpha' } }),
        makeItem({ id: '2', status: 'WIP', price: 10, currency: 'EUR', project: { id: 'p1', name: 'Project Alpha' } }),
        makeItem({ id: '3', status: 'WIP', price: 15, currency: 'EUR', project: { id: 'p2', name: 'Project Beta' } }),
      ]);
      const result = component.wastedMoney();
      expect(result!.projectBreakdown).toEqual(
        jasmine.arrayWithExactContents([
          { project: 'Project Alpha', wastedMoneyBreakdown: { breakdown: [{ currency: 'EUR', amount: 30 }] } },
          { project: 'Project Beta', wastedMoneyBreakdown: { breakdown: [{ currency: 'EUR', amount: 15 }] } },
        ]),
      );
    });

    it('should group items without a project under "No Project"', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WIP', price: 25, currency: 'EUR', project: null }),
        makeItem({ id: '2', status: 'WIP', price: 10, currency: 'EUR', project: null }),
      ]);
      const result = component.wastedMoney();
      expect(result!.projectBreakdown).toEqual([
        { project: 'No Project', wastedMoneyBreakdown: { breakdown: [{ currency: 'EUR', amount: 35 }] } },
      ]);
    });

    it('should include multi-currency breakdown per project', () => {
      reloadWith([
        makeItem({ id: '1', status: 'WIP', price: 20, currency: 'EUR', project: { id: 'p1', name: 'Alpha' } }),
        makeItem({ id: '2', status: 'WIP', price: 10, currency: 'GBP', project: { id: 'p1', name: 'Alpha' } }),
      ]);
      const result = component.wastedMoney();
      const alpha = result!.projectBreakdown.find((p) => p.project === 'Alpha');
      expect(alpha!.wastedMoneyBreakdown.breakdown).toEqual(
        jasmine.arrayWithExactContents([
          { currency: 'EUR', amount: 20 },
          { currency: 'GBP', amount: 10 },
        ]),
      );
    });
  });
});
