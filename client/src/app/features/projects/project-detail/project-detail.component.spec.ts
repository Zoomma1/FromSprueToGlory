import { ProjectDetailComponent } from './project-detail.component';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApiService } from '../../../core/services/api.service';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Item } from '../../../classes/items';

describe(ProjectDetailComponent.name, () => {
    let component: ProjectDetailComponent;
    let fixture: ComponentFixture<ProjectDetailComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

    const mockProject = {
        id: 'project-1',
        userId: 'user1',
        name: 'Project 1',
        description: 'Test project',
        color: null,
        tags: [],
        createdAt: '2026-02-15T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
        Items: [
            { id: 'item-1', status: 'WANT' } as never,
            { id: 'item-2', status: 'WIP' } as never,
            { id: 'item-3', status: 'FINISHED' } as never,
        ],
    };

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', [
            'getProject', 'getItems', 'changeItemStatus', 'assignItemsToProject', 'unassignItemsFromProject',
        ]);
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        dialogRefSpy.afterClosed.and.returnValue(of(true));
        dialogSpy.open.and.returnValue(dialogRefSpy);

        apiSpy.getProject.and.returnValue(of(mockProject));
        apiSpy.getItems.and.returnValue(of([
            { id: 'item-1', projectId: null },
            { id: 'item-2', projectId: 'project-2' },
            { id: 'item-3', projectId: null },
        ] as Item[]));
        apiSpy.changeItemStatus.and.returnValue(of({} as Item));
        apiSpy.assignItemsToProject.and.returnValue(of(undefined as void));
        apiSpy.unassignItemsFromProject.and.returnValue(of(undefined as void));

        await TestBed.configureTestingModule({
            imports: [ProjectDetailComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'project-1' } } } },
                { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
            ],
        })
            .overrideComponent(ProjectDetailComponent, {
                set: {
                    providers: [
                        { provide: ApiService, useValue: apiSpy },
                        { provide: MatSnackBar, useValue: snackBarSpy },
                        { provide: MatDialog, useValue: dialogSpy },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ProjectDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Component initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should load project on init', () => {
            expect(apiSpy.getProject).toHaveBeenCalledWith('project-1');
            expect(component.project()).toEqual(jasmine.objectContaining({ id: 'project-1', name: 'Project 1' }));
        });

        it('should populate the project signal after loading', () => {
            expect(component.project()).toEqual(jasmine.objectContaining({ id: 'project-1', name: 'Project 1' }));
        });

        it('should not call API if no id and no project loaded', () => {
            component.project.set(null);
            apiSpy.getProject.calls.reset();
            component.loadProject();
            expect(apiSpy.getProject).not.toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        it('should handle project load failure', fakeAsync(() => {
            const router = TestBed.inject(Router);
            component.project.set(null);
            apiSpy.getProject.and.returnValue(throwError(() => new Error('Project load failed')));

            component.loadProject('project-2');
            tick();

            expect(component.project()).toBeNull();
            expect(snackBarSpy.open).toHaveBeenCalledWith(
                'Failed to load project details. Please try again.',
                'Dismiss',
                { duration: 5000 }
            );
            expect(router.navigate).toHaveBeenCalledWith(['/projects']);
        }));
    });

    describe('onStatusChange - Advance or revert item status', () => {
        it('should advance item status', fakeAsync(() => {
            component.onStatusChange({ item: { id: 'item-1', status: 'WANT' } as never, direction: 'next' });
            tick();

            expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('item-1', 'BOUGHT');
            expect(snackBarSpy.open).toHaveBeenCalledWith('Status → Bought', 'OK', { duration: 2000 });
            expect(apiSpy.getProject).toHaveBeenCalledTimes(2);
        }));

        it('should not call API if advancing from last status', () => {
            apiSpy.changeItemStatus.calls.reset();
            component.onStatusChange({ item: { id: 'item-1', status: 'FINISHED' } as never, direction: 'next' });
            expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
        });

        it('should handle error when changing status', fakeAsync(() => {
            apiSpy.changeItemStatus.and.returnValue(throwError(() => ({ error: { error: null } })));
            component.onStatusChange({ item: { id: 'item-2', status: 'WIP' } as never, direction: 'next' });
            tick();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed', 'OK', { duration: 3000 });
        }));

        it('should handle error with message when changing status', fakeAsync(() => {
            apiSpy.changeItemStatus.and.returnValue(throwError(() => ({ error: { error: 'Custom error' } })));
            component.onStatusChange({ item: { id: 'item-2', status: 'WIP' } as never, direction: 'next' });
            tick();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Custom error', 'OK', { duration: 3000 });
        }));
    });

    describe('Assign panel - Toggle and manage unassigned items', () => {
        it('should toggle assign panel visibility', () => {
            expect(component.showAssignPanel()).toBeFalse();
            component.toggleAssignPanel();
            expect(component.showAssignPanel()).toBeTrue();
            component.toggleAssignPanel();
            expect(component.showAssignPanel()).toBeFalse();
        });

        it('should call getItems when opening assign panel', () => {
            apiSpy.getItems.calls.reset();
            component.toggleAssignPanel();
            expect(apiSpy.getItems).toHaveBeenCalledWith({ projectId: '' });
        });

        it('should only show items with no project in assign panel', () => {
            component.toggleAssignPanel();
            expect(component.unassignedItems()).toEqual([
                { id: 'item-1', projectId: null },
                { id: 'item-3', projectId: null },
            ] as Item[]);
        });

        it('should not call getItems when panel is closed', () => {
            apiSpy.getItems.calls.reset();
            component.toggleAssignPanel();
            component.toggleAssignPanel();
            expect(apiSpy.getItems).toHaveBeenCalledTimes(1);
        });
    });

    describe('Assign / Unassign items', () => {
        it('should assign item to project', fakeAsync(() => {
            component.assignItem('item-1');
            tick();

            expect(apiSpy.assignItemsToProject).toHaveBeenCalledWith('project-1', ['item-1']);
            expect(snackBarSpy.open).toHaveBeenCalledWith('Item assigned', 'OK', { duration: 2000 });
            expect(apiSpy.getProject).toHaveBeenCalledTimes(2);
        }));

        it('should unassign item from project', fakeAsync(() => {
            component.unassignItem('item-2');
            tick();

            expect(apiSpy.unassignItemsFromProject).toHaveBeenCalledWith('project-1', ['item-2']);
            expect(snackBarSpy.open).toHaveBeenCalledWith('Item removed from project', 'OK', { duration: 2000 });
            expect(apiSpy.getProject).toHaveBeenCalledTimes(2);
        }));

        it('should call assign and unassign with correct project ID', fakeAsync(() => {
            component.assignItem('item-1');
            tick();
            expect(apiSpy.assignItemsToProject).toHaveBeenCalledWith('project-1', ['item-1']);

            component.unassignItem('item-2');
            tick();
            expect(apiSpy.unassignItemsFromProject).toHaveBeenCalledWith('project-1', ['item-2']);
        }));

        it('should remove assigned item from unassignedItems signal', fakeAsync(() => {
            component.unassignedItems.set([
                { id: 'item-1', projectId: null } as Item,
                { id: 'item-3', projectId: null } as Item,
            ]);

            component.assignItem('item-1');
            tick();

            expect(component.unassignedItems()).toEqual([{ id: 'item-3', projectId: null } as Item]);
        }));

        it('should not call API if no project when assigning or unassigning', () => {
            component.project.set(null);
            apiSpy.assignItemsToProject.calls.reset();
            apiSpy.unassignItemsFromProject.calls.reset();

            component.assignItem('item-1');
            expect(apiSpy.assignItemsToProject).not.toHaveBeenCalled();

            component.unassignItem('item-2');
            expect(apiSpy.unassignItemsFromProject).not.toHaveBeenCalled();
        });

        it('should reload project after assigning or unassigning item', fakeAsync(() => {
            component.assignItem('item-1');
            tick();
            expect(apiSpy.getProject).toHaveBeenCalledTimes(2);

            component.unassignItem('item-2');
            tick();
            expect(apiSpy.getProject).toHaveBeenCalledTimes(3);
        }));
    });

    describe('toSpendSummary - WANT items budget', () => {
        it('should return null when project has no items', () => {
            component.project.set({ ...mockProject, items: [] } as never);
            expect(component.toSpendSummary()).toBeNull();
        });

        it('should return null when no items have WANT status', () => {
            component.project.set({
                ...mockProject,
                items: [
                    { id: 'item-1', status: 'WIP', price: 20 },
                    { id: 'item-2', status: 'FINISHED', price: 10 },
                ],
            } as never);
            expect(component.toSpendSummary()).toBeNull();
        });

        it('should calculate total from WANT items with price', () => {
            component.project.set({
                ...mockProject,
                items: [
                    { id: 'item-1', status: 'WANT', price: 30 },
                    { id: 'item-2', status: 'WANT', price: 20 },
                    { id: 'item-3', status: 'WIP', price: 50 },
                ],
            } as never);
            expect(component.toSpendSummary()?.total).toBe(50);
        });

        it('should exclude WANT items without price from total', () => {
            component.project.set({
                ...mockProject,
                items: [
                    { id: 'item-1', status: 'WANT', price: 30 },
                    { id: 'item-2', status: 'WANT', price: null },
                ],
            } as never);
            expect(component.toSpendSummary()?.total).toBe(30);
        });

        it('should count WANT items without price', () => {
            component.project.set({
                ...mockProject,
                items: [
                    { id: 'item-1', status: 'WANT', price: 30 },
                    { id: 'item-2', status: 'WANT', price: null },
                    { id: 'item-3', status: 'WANT', price: null },
                ],
            } as never);
            expect(component.toSpendSummary()?.missing).toBe(2);
        });

        it('should return total 0 and missing equal to all when all WANT items have no price', () => {
            component.project.set({
                ...mockProject,
                items: [
                    { id: 'item-1', status: 'WANT', price: null },
                    { id: 'item-2', status: 'WANT', price: null },
                ],
            } as never);
            const summary = component.toSpendSummary();
            expect(summary).not.toBeNull();
            expect(summary?.total).toBe(0);
            expect(summary?.missing).toBe(2);
        });
    });

    describe('Navigation', () => {
        it('should navigate back to projects list', () => {
            const router = TestBed.inject(Router);
            component.goBack();
            expect(router.navigate).toHaveBeenCalledWith(['/projects']);
        });
    });

    describe('Dialog - Item creation', () => {
        it('should open item creation dialog', () => {
            component.openCreateDialog();
            expect(dialogSpy.open).toHaveBeenCalled();
        });

        it('should pass project id and name as dialog data', () => {
            component.openCreateDialog();
            expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
                data: jasmine.objectContaining({
                    mode: 'create',
                    defaultProjectId: 'project-1',
                    defaultProjectName: 'Project 1',
                }),
            }));
        });

        it('should reload project after creating item', fakeAsync(() => {
            component.openCreateDialog();
            tick();
            expect(apiSpy.getProject).toHaveBeenCalledTimes(2);
        }));

        it('should not reload project if dialog is dismissed', fakeAsync(() => {
            const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(undefined));
            dialogSpy.open.and.returnValue(dialogRefSpy);

            apiSpy.getProject.calls.reset();
            component.openCreateDialog();
            tick();
            expect(apiSpy.getProject).not.toHaveBeenCalled();
        }));
    });

    describe('Item duplication', () => {
        const mockItem = { id: 'item-1', name: 'Intercessors', status: 'WIP', quantity: 5, gameSystemId: 'gs1', factionId: 'f1', price: null, currency: 'EUR', notes: null, projectId: 'project-1', tags: [] } as unknown as Item;

        beforeEach(() => {
            apiSpy.createItem = jasmine.createSpy('createItem').and.returnValue(of({} as Item));
            component.project.set({ ...mockProject, items: [mockItem] } as never);
        });

        it('should call createItem with status WANT and incremented name', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            component.duplicateItem(mockItem);
            expect(apiSpy.createItem).toHaveBeenCalledWith(jasmine.objectContaining({
                name: 'Intercessors (2)',
                status: 'WANT',
            }));
        });

        it('should increment to (3) if (2) already exists', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            const itemWithCopy = { ...mockItem, name: 'Intercessors (2)' } as unknown as Item;
            component.project.set({ ...mockProject, items: [mockItem, itemWithCopy] } as never);
            component.duplicateItem(mockItem);
            expect(apiSpy.createItem).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Intercessors (3)' }));
        });

        it('should show confirmation dialog with source and target name', () => {
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
            component.duplicateItem(mockItem);
            expect(confirmSpy).toHaveBeenCalledWith('Duplicate "Intercessors" as "Intercessors (2)"?');
        });

        it('should not call createItem if user cancels', () => {
            spyOn(window, 'confirm').and.returnValue(false);
            component.duplicateItem(mockItem);
            expect(apiSpy.createItem).not.toHaveBeenCalled();
        });

        it('should reload project after successful duplication', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            apiSpy.getProject.calls.reset();
            component.duplicateItem(mockItem);
            expect(apiSpy.getProject).toHaveBeenCalledTimes(1);
        });

        it('should show snackbar after successful duplication', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            component.duplicateItem(mockItem);
            expect(snackBarSpy.open).toHaveBeenCalledWith('"Intercessors (2)" created', 'OK', { duration: 2000 });
        });

        it('should show error snackbar when duplication fails', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            apiSpy.createItem.and.returnValue(throwError(() => new Error('fail')));
            component.duplicateItem(mockItem);
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to duplicate item', 'OK', { duration: 3000 });
        });
    });

    describe('Dialog - Item editing', () => {
        const mockItem = { id: 'item-1', status: 'WANT' } as Item;

        it('should open edit dialog with mode edit and item data', () => {
            component.openEditDialog(mockItem);
            expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
                data: jasmine.objectContaining({ mode: 'edit', item: mockItem }),
            }));
        });

        it('should reload project after editing item', fakeAsync(() => {
            apiSpy.getProject.calls.reset();
            component.openEditDialog(mockItem);
            tick();
            expect(apiSpy.getProject).toHaveBeenCalledTimes(1);
        }));

        it('should not reload project if edit dialog is dismissed', fakeAsync(() => {
            const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(undefined));
            dialogSpy.open.and.returnValue(dialogRefSpy);

            apiSpy.getProject.calls.reset();
            component.openEditDialog(mockItem);
            tick();
            expect(apiSpy.getProject).not.toHaveBeenCalled();
        }));
    });

    describe('Error Handling', () => {
        it('should show error snackbar when getItems fails in toggleAssignPanel', () => {
            apiSpy.getItems.and.returnValue(throwError(() => new Error('fail')));
            component.toggleAssignPanel();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load unassigned items', 'OK', { duration: 3000 });
        });

        it('should show error snackbar when assignItem fails', fakeAsync(() => {
            apiSpy.assignItemsToProject.and.returnValue(throwError(() => new Error('fail')));
            component.assignItem('item-1');
            tick();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to assign item', 'OK', { duration: 3000 });
        }));

        it('should show error snackbar when unassignItem fails', fakeAsync(() => {
            apiSpy.unassignItemsFromProject.and.returnValue(throwError(() => new Error('fail')));
            component.unassignItem('item-2');
            tick();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to remove item', 'OK', { duration: 3000 });
        }));
    });
});
