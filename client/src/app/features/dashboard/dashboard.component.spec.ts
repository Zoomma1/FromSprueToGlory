import { DashboardComponent } from './dashboard.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
});
