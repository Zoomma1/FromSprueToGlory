import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ItemsListComponent } from './items-list.component';
import { ApiService } from '../../../core/services/api.service';
import { Item } from '../../../classes/items';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

describe('ItemsListComponent', () => {
    let component: ItemsListComponent;
    let fixture: ComponentFixture<ItemsListComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

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
            notes: null,
            tags: [],
            photoKey: null,
            createdAt: '2026-02-15T00:00:00Z',
            updatedAt: '2026-02-15T00:00:00Z',
            factionId: '1',
            faction: { id: '1', name: 'Ultramarines' },
            gameSystemId: '1',
            gameSystem: { id: '1', name: '40K', slug: '40k' },
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
            notes: null,
            tags: [],
            photoKey: null,
            createdAt: '2026-02-15T00:00:00Z',
            updatedAt: '2026-02-15T00:00:00Z',
            factionId: '2',
            faction: { id: '2', name: 'Orks' },
            gameSystemId: '1',
            gameSystem: { id: '1', name: '40K', slug: '40k' },
            colorScheme: null,
            projectId: null,
            project: null,
        },
    ];

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', ['getItems', 'deleteItem', 'changeItemStatus']);
        apiSpy.getItems.and.returnValue(of(mockItems));
        apiSpy.changeItemStatus.and.returnValue(of(mockItems[0]));

        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [ItemsListComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: ApiService, useValue: apiSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
                { provide: MatDialog, useValue: dialogSpy },
            ],
        }).overrideComponent(ItemsListComponent, {
              set: {
                providers: [
                    { provide: ApiService, useValue: apiSpy },
                    { provide: MatSnackBar, useValue: snackBarSpy },
                    { provide: MatDialog, useValue: dialogSpy },
                ]
              }
        }).compileComponents();

        fixture = TestBed.createComponent(ItemsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Component initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should call ApiService.getItems on init', () => {
            expect(apiSpy.getItems).toHaveBeenCalled();
        });
    });

    describe('Data loading', () => {
        it('should populate items signal after load', () => {
            expect(component.items().length).toBe(2);
            expect(component.items()[0].name).toBe('Intercessors');
        });

        it('should apply status filter when loading items', () => {
            apiSpy.getItems.calls.reset();
            component.statusFilter = 'BOUGHT';
            component.loadItems();

            expect(apiSpy.getItems).toHaveBeenCalledWith({ status: 'BOUGHT' });
        });

        it('should load all items when status filter is cleared', () => {
            apiSpy.getItems.calls.reset();
            component.statusFilter = '';
            component.loadItems();

            expect(apiSpy.getItems).toHaveBeenCalledWith({});
        })

        it('should handle empty items list', () => {
            apiSpy.getItems.and.returnValue(of([]));
            component.loadItems();
            expect(component.items().length).toBe(0);
        });
    });

    describe('Status helpers', () => {
        it('should set the status with setStatus', () => {
            component.setStatus(mockItems[0], 'BOUGHT');
            expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('1', 'BOUGHT');

            apiSpy.changeItemStatus.calls.reset();
            component.setStatus(mockItems[1], 'WANT');
            expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('2', 'WANT');
            expect(snackBarSpy.open).toHaveBeenCalledWith('Status → Want', 'OK', { duration: 2000 });
        });

        it('should not call changeItemStatus if new status is same as current', () => {
            component.setStatus(mockItems[0], 'WANT');
            expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();

            component.setStatus(mockItems[1], 'BOUGHT');
            expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
            expect(snackBarSpy.open).not.toHaveBeenCalled();
        })
    });

    describe('Status change', () => {
        it('should call changeItemStatus with next status', () => {
          component.nextStatus(mockItems[0]);
          expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('1', 'BOUGHT');

          apiSpy.changeItemStatus.calls.reset();
          component.nextStatus(mockItems[1]);
          expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('2', 'ASSEMBLED');
        });

        it('should call changeItemStatus with previous status', () => {
          component.prevStatus(mockItems[1]);
          expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('2', 'WANT');

          apiSpy.changeItemStatus.calls.reset();
          component.prevStatus(mockItems[0]);
          expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
        });

        it('should not call changeItemStatus if status cannot advance', () => {
          const finishedItem = { ...mockItems[1], status: 'FINISHED' } as Item;
          component.nextStatus(finishedItem);
          expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
        });

        it('should not call changeItemStatus if status cannot revert', () => {
          component.prevStatus(mockItems[0]);
          component.prevStatus(mockItems[0]);
          expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
        });

        it('should reload items after status change to next status', () => {
          component.nextStatus(mockItems[0]);
          expect(apiSpy.getItems).toHaveBeenCalledTimes(2);
        });

        it('should reload items after status change to previous status', () => {
          component.prevStatus(mockItems[1]);
          expect(apiSpy.getItems).toHaveBeenCalledTimes(2);
        });

        it('should show snackbar on successful status change to next status', () => {
          component.nextStatus(mockItems[0]);
          expect(snackBarSpy.open).toHaveBeenCalledWith('Status → Bought', 'OK', { duration: 2000 });
        });

        it('should show snackbar on successful status change to previous status', () => {
          component.prevStatus(mockItems[1]);
          expect(snackBarSpy.open).toHaveBeenCalledWith('Status → Want', 'OK', { duration: 2000 });
        });

        it('should show snackbar on status change error with specific message', () => {
          snackBarSpy.open.calls.reset();
          apiSpy.changeItemStatus.and.returnValue(throwError(() => ({ error: { error: 'Custom error message' } })));
          component.nextStatus(mockItems[0]);
          expect(snackBarSpy.open).toHaveBeenCalledWith('Custom error message', 'OK', { duration: 3000 });
        });

        it('should show snackbar on status change error', () => {
          snackBarSpy.open.calls.reset();
          apiSpy.changeItemStatus.and.returnValue(throwError(() => ({})));
          component.nextStatus(mockItems[0]);
          expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to change status', 'OK', { duration: 3000 });
        });
    });

    describe('Filtering', () => {
        it('should reload items when status filter changes', () => {
            apiSpy.getItems.calls.reset();
            component.statusFilter = 'BOUGHT';
            component.loadItems();

            expect(apiSpy.getItems).toHaveBeenCalledWith({ status: 'BOUGHT' });
        });
    });

  describe('Dialog form', () => {
        it('should open create dialog and reload after close', () => {
            apiSpy.getItems.calls.reset();
            dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as unknown as ReturnType<MatDialog['open']>);

            component.openCreateDialog();
            expect(dialogSpy.open).toHaveBeenCalled();
            expect(apiSpy.getItems).toHaveBeenCalledTimes(1);
        });

        it('should open create dialog and not reload if result is falsy', () => {
            apiSpy.getItems.calls.reset();
            dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as unknown as ReturnType<MatDialog['open']>);

            component.openCreateDialog();
            expect(dialogSpy.open).toHaveBeenCalled();
            expect(apiSpy.getItems).not.toHaveBeenCalled();
        });

        it('should open edit dialog, populate it and reload after close', () => {
            apiSpy.getItems.calls.reset();
            dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as unknown as ReturnType<MatDialog['open']>);

            component.openEditDialog(mockItems[0]);
            expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
                data: jasmine.objectContaining({
                    mode: 'edit',
                    item: mockItems[0],
                }),
            }));
            expect(apiSpy.getItems).toHaveBeenCalledTimes(1);
        });

        it('should open edit dialog and not reload if dismissed', () => {
            apiSpy.getItems.calls.reset();
            dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as unknown as ReturnType<MatDialog['open']>);

            component.openEditDialog(mockItems[0]);
            expect(dialogSpy.open).toHaveBeenCalled();
            expect(apiSpy.getItems).not.toHaveBeenCalled();
        });
  });

  describe('Item deletion', () => {
        it('should call deleteItem and reload items on success', () => {
            apiSpy.getItems.calls.reset();
            spyOn(window, 'confirm').and.returnValue(true);
            apiSpy.deleteItem.and.returnValue(of(undefined));

            component.deleteItem(mockItems[0]);
            expect(apiSpy.deleteItem).toHaveBeenCalledWith('1');
            expect(apiSpy.getItems).toHaveBeenCalledTimes(1);
        });

        it('should show snackbar after successful deletion', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            apiSpy.deleteItem.and.returnValue(of(undefined));

            component.deleteItem(mockItems[0]);
            expect(snackBarSpy.open).toHaveBeenCalledWith('Item deleted', 'OK', { duration: 3000 });
        });

        it('should display correct item name in confirm dialog', () => {
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
            apiSpy.deleteItem.and.returnValue(of(undefined));

            component.deleteItem(mockItems[0]);
            expect(confirmSpy).toHaveBeenCalledWith('Delete "Intercessors"?');
        });

        it('should not call deleteItem if user cancels', () => {
            spyOn(window, 'confirm').and.returnValue(false);
            component.deleteItem(mockItems[0]);
            expect(apiSpy.deleteItem).not.toHaveBeenCalled();
        });

        it('should show error snackbar when deleteItem fails', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            apiSpy.deleteItem.and.returnValue(throwError(() => new Error('fail')));
            component.deleteItem(mockItems[0]);
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to delete item', 'OK', { duration: 3000 });
        });
  });

  describe('Error Handling', () => {
        it('should show error snackbar when loadItems fails', () => {
            apiSpy.getItems.and.returnValue(throwError(() => new Error('fail')));
            component.loadItems();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load items', 'OK', { duration: 3000 });
        });
  });
});
