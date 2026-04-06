import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProjectFormDialogComponent } from './project-form-dialog.component';
import { ApiService } from '../../../core/services/api.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Project } from '../../../classes/project';

describe('ProjectFormDialogComponent', () => {
    let component: ProjectFormDialogComponent;
    let fixture: ComponentFixture<ProjectFormDialogComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ProjectFormDialogComponent>>;

    const mockProject: Project = {
        id: 'p-1',
        userId: 'user1',
        name: 'Kill Team',
        description: 'My project',
        color: null,
        tags: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
    };

    async function createComponent(
        dialogData: Record<string, unknown> = { mode: 'create' },
        spySetup?: (api: jasmine.SpyObj<ApiService>) => void,
    ) {
        apiSpy = jasmine.createSpyObj('ApiService', ['createProject', 'updateProject', 'getGameSystems', 'getFactions']);
        apiSpy.getGameSystems.and.returnValue(of([]));
        apiSpy.getFactions.and.returnValue(of([]));
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        if (spySetup) spySetup(apiSpy);

        await TestBed.resetTestingModule().configureTestingModule({
            imports: [ProjectFormDialogComponent, NoopAnimationsModule],
        }).overrideComponent(ProjectFormDialogComponent, {
            set: {
                providers: [
                    { provide: ApiService, useValue: apiSpy },
                    { provide: MAT_DIALOG_DATA, useValue: dialogData },
                    { provide: MatDialogRef, useValue: dialogRefSpy },
                    { provide: MatSnackBar, useValue: snackBarSpy },
                ],
            },
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectFormDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    describe('Create mode', () => {
        beforeEach(async () => {
            await createComponent();
        });

        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize with empty form', () => {
            expect(component.form.value.name).toBe('');
            expect(component.form.value.description).toBe('');
        });

        it('should have saving set to false', () => {
            expect(component.saving()).toBeFalse();
        });

        it('should not save when form is invalid', () => {
            component.form.patchValue({ name: '' });
            component.save();
            expect(apiSpy.createProject).not.toHaveBeenCalled();
        });

        it('should call createProject on save', () => {
            apiSpy.createProject.and.returnValue(of({} as Project));
            component.form.patchValue({ name: 'New Project', description: 'Desc' });
            component.save();

            expect(apiSpy.createProject).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'New Project', description: 'Desc' }));
            expect(snackBarSpy.open).toHaveBeenCalledWith('Saved!', 'OK', { duration: 3000 });
            expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
        });

        it('should set saving to true during save', () => {
            apiSpy.createProject.and.returnValue(of({} as Project));
            component.form.patchValue({ name: 'Test' });
            component.save();
            expect(component.saving()).toBeTrue();
        });

        it('should show error snackbar on save failure', () => {
            apiSpy.createProject.and.returnValue(throwError(() => ({ error: { error: 'Name taken' } })));
            component.form.patchValue({ name: 'Test' });
            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Name taken', 'OK', { duration: 5000 });
            expect(component.saving()).toBeFalse();
            expect(dialogRefSpy.close).not.toHaveBeenCalled();
        });

        it('should show generic error when error has no message', () => {
            apiSpy.createProject.and.returnValue(throwError(() => ({})));
            component.form.patchValue({ name: 'Test' });
            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed', 'OK', { duration: 5000 });
        });
    });

    describe('Edit mode', () => {
        beforeEach(async () => {
            await createComponent({ mode: 'edit', project: mockProject });
        });

        it('should populate form with project data', () => {
            expect(component.form.value.name).toBe('Kill Team');
            expect(component.form.value.description).toBe('My project');
        });

        it('should call updateProject on save', () => {
            apiSpy.updateProject.and.returnValue(of({} as Project));
            component.form.patchValue({ name: 'Updated Name' });
            component.save();

            expect(apiSpy.updateProject).toHaveBeenCalledWith('p-1', jasmine.objectContaining({ name: 'Updated Name', description: 'My project' }));
            expect(snackBarSpy.open).toHaveBeenCalledWith('Saved!', 'OK', { duration: 3000 });
            expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
        });

        it('should show error snackbar on update failure', () => {
            apiSpy.updateProject.and.returnValue(throwError(() => ({ error: { error: 'Update failed' } })));
            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Update failed', 'OK', { duration: 5000 });
            expect(component.saving()).toBeFalse();
        });
    });

    describe('Form validation', () => {
        beforeEach(async () => {
            await createComponent();
        });

        it('should be invalid when name is empty', () => {
            component.form.patchValue({ name: '' });
            expect(component.form.invalid).toBeTrue();
        });

        it('should be valid when name is provided', () => {
            component.form.patchValue({ name: 'Valid Name' });
            expect(component.form.valid).toBeTrue();
        });

        it('should be valid without description', () => {
            component.form.patchValue({ name: 'Valid Name', description: '' });
            expect(component.form.valid).toBeTrue();
        });
    });
});

