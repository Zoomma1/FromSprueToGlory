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

  // Initialization

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

  // Error handling

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

  // Status helpers

  it('should return correct status label', () => {
    expect(component.getStatusLabel('WANT')).toBe('Want');
    expect(component.getStatusLabel('WIP')).toBe('WIP');
    expect(component.getStatusLabel('FINISHED')).toBe('Finished');
    expect(component.getStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
  });

  it('should determine if item can advance status', () => {
    expect(component.canAdvance({ status: 'WANT' } as never)).toBeTrue();
    expect(component.canAdvance({ status: 'WIP' } as never)).toBeTrue();
    expect(component.canAdvance({ status: 'FINISHED' } as never)).toBeFalse();
  });

  // nextStatus────

  it('should advance item status', fakeAsync(() => {
    component.nextStatus({ id: 'item-1', status: 'WANT' } as never);
    tick();

    expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('item-1', 'BOUGHT');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Status → Bought', 'OK', { duration: 2000 });
    expect(apiSpy.getProject).toHaveBeenCalledTimes(2);
  }));

  it('should not call API if advancing from last status', () => {
    apiSpy.changeItemStatus.calls.reset();
    component.nextStatus({ id: 'item-1', status: 'FINISHED' } as never);
    expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
  });

  // setStatus─────

  it('should set item status', fakeAsync(() => {
    component.setStatus({ id: 'item-2', status: 'WIP' } as never, 'FINISHED');
    tick();

    expect(apiSpy.changeItemStatus).toHaveBeenCalledWith('item-2', 'FINISHED');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Status → Finished', 'OK', { duration: 2000 });
    expect(apiSpy.getProject).toHaveBeenCalledTimes(2);
  }));

  it('should not call API if setting to same status', () => {
    apiSpy.changeItemStatus.calls.reset();
    component.setStatus({ id: 'item-2', status: 'WIP' } as never, 'WIP');
    expect(apiSpy.changeItemStatus).not.toHaveBeenCalled();
  });

  it('should handle error when changing status', fakeAsync(() => {
    apiSpy.changeItemStatus.and.returnValue(throwError(() => ({ error: { error: null } })));
    component.setStatus({ id: 'item-2', status: 'WIP' } as never, 'FINISHED');
    tick();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed', 'OK', { duration: 3000 });
  }));

  // Assign panel──

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

  // Assign / Unassign ────────────────────────────────────────────────────

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

  // Navigation────

  it('should navigate back to projects list', () => {
    const router = TestBed.inject(Router);
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/projects']);
  });

  // Dialog────────

  it('should open item creation dialog', () => {
    component.openCreateDialog();
    expect(dialogSpy.open).toHaveBeenCalled();
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
