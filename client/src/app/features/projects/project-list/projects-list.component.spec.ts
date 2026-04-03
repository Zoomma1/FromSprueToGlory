import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ProjectsListComponent } from './projects-list.component';
import { ApiService } from '../../../core/services/api.service';
import { Project } from '../../../classes/project';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

describe('ProjectsListComponent', () => {
    let component: ProjectsListComponent;
    let fixture: ComponentFixture<ProjectsListComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

    const mockProjects: Project[] = [
        {
            id: 'p-1',
            userId: 'user1',
            name: 'Kill Team',
            description: 'My kill team project',
            color: null,
            tags: [],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            items: [],
            completion: 50,
            itemCount: 4,
        },
        {
            id: 'p-2',
            userId: 'user1',
            name: 'Combat Patrol',
            description: null,
            color: null,
            tags: [],
            createdAt: '2026-02-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
            items: [],
            completion: 0,
            itemCount: 0,
        },
    ];

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', ['getProjects', 'deleteProject']);
        apiSpy.getProjects.and.returnValue(of(mockProjects));

        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [ProjectsListComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: ApiService, useValue: apiSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
                { provide: MatDialog, useValue: dialogSpy },
            ],
        }).overrideComponent(ProjectsListComponent, {
            add: {
                providers: [
                    { provide: ApiService, useValue: apiSpy },
                    { provide: MatSnackBar, useValue: snackBarSpy },
                    { provide: MatDialog, useValue: dialogSpy },
                ],
            },
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Component initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should load projects on init', () => {
            expect(apiSpy.getProjects).toHaveBeenCalled();
        });

        it('should populate projects signal after load', () => {
            expect(component.projects().length).toBe(2);
            expect(component.projects()[0].name).toBe('Kill Team');
        });
    });

    describe('Data loading', () => {
        it('should handle empty projects list', () => {
            apiSpy.getProjects.and.returnValue(of([]));
            component.loadProjects();
            expect(component.projects().length).toBe(0);
        });

        it('should refresh projects on loadProjects call', () => {
            apiSpy.getProjects.calls.reset();
            component.loadProjects();
            expect(apiSpy.getProjects).toHaveBeenCalledTimes(1);
        });
    });

    describe('Create dialog', () => {
        it('should open create dialog and reload after close', () => {
            apiSpy.getProjects.calls.reset();
            dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

            component.openCreateDialog();
            expect(dialogSpy.open).toHaveBeenCalled();
            expect(apiSpy.getProjects).toHaveBeenCalledTimes(1);
        });

        it('should open create dialog and not reload if dismissed', () => {
            apiSpy.getProjects.calls.reset();
            dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);

            component.openCreateDialog();
            expect(dialogSpy.open).toHaveBeenCalled();
            expect(apiSpy.getProjects).not.toHaveBeenCalled();
        });
    });

    describe('Edit dialog', () => {
        it('should open edit dialog with project data and reload after close', () => {
            apiSpy.getProjects.calls.reset();
            const event = new Event('click');
            spyOn(event, 'stopPropagation');
            dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

            component.openEditDialog(mockProjects[0], event);

            expect(event.stopPropagation).toHaveBeenCalled();
            expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
                data: jasmine.objectContaining({ mode: 'edit', project: mockProjects[0] }),
            }));
            expect(apiSpy.getProjects).toHaveBeenCalledTimes(1);
        });

        it('should open edit dialog and not reload if dismissed', () => {
            apiSpy.getProjects.calls.reset();
            const event = new Event('click');
            dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);

            component.openEditDialog(mockProjects[0], event);
            expect(apiSpy.getProjects).not.toHaveBeenCalled();
        });
    });

    describe('Delete project', () => {
        it('should delete project and reload on confirmation', () => {
            apiSpy.getProjects.calls.reset();
            apiSpy.deleteProject.and.returnValue(of(undefined));
            spyOn(window, 'confirm').and.returnValue(true);
            const event = new Event('click');
            spyOn(event, 'stopPropagation');

            component.deleteProject(mockProjects[0], event);

            expect(event.stopPropagation).toHaveBeenCalled();
            expect(apiSpy.deleteProject).toHaveBeenCalledWith('p-1');
            expect(snackBarSpy.open).toHaveBeenCalledWith('Project deleted', 'OK', { duration: 3000 });
            expect(apiSpy.getProjects).toHaveBeenCalledTimes(1);
        });

        it('should not delete if user cancels confirm', () => {
            spyOn(window, 'confirm').and.returnValue(false);
            const event = new Event('click');

            component.deleteProject(mockProjects[0], event);
            expect(apiSpy.deleteProject).not.toHaveBeenCalled();
        });

        it('should display correct project name in confirm dialog', () => {
            apiSpy.deleteProject.and.returnValue(of(undefined));
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
            const event = new Event('click');

            component.deleteProject(mockProjects[0], event);
            expect(confirmSpy).toHaveBeenCalledWith('Delete project "Kill Team"?');
        });

        it('should show error snackbar when deleteProject fails', () => {
            apiSpy.deleteProject.and.returnValue(throwError(() => new Error('fail')));
            spyOn(window, 'confirm').and.returnValue(true);
            const event = new Event('click');

            component.deleteProject(mockProjects[0], event);
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to delete project', 'OK', { duration: 3000 });
        });
    });

    describe('Error Handling', () => {
        it('should show error snackbar when loadProjects fails', () => {
            apiSpy.getProjects.and.returnValue(throwError(() => new Error('fail')));
            component.loadProjects();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load projects', 'OK', { duration: 3000 });
        });
    });
});

