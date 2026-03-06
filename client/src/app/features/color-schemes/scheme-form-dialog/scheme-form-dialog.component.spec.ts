import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { SchemeFormDialogComponent } from './scheme-form-dialog.component';
import { ApiService } from '../../../core/services/api.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Technique } from '../../../classes/technique';
import { Paint } from '../../../classes/paint';
import { ColorSchemeFull } from '../../../classes/color-scheme';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

describe('SchemeFormDialogComponent', () => {
    let component: SchemeFormDialogComponent;
    let fixture: ComponentFixture<SchemeFormDialogComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SchemeFormDialogComponent>>;

    const mockTechniques: Technique[] = [
        { id: 't-1', name: 'Dry Brush', description: 'Highlight raised areas' } as Technique,
        { id: 't-2', name: 'Washing', description: 'Add depth in recesses' } as Technique,
    ];

    const mockPaints: Paint[] = [
        { id: 'p-1', name: 'Chaos Black', code: 'CB', brandId: 'pb-1', type: 'Base', notes: null, brand: { name: 'Citadel', slug: 'citadel' } } as Paint,
        { id: 'p-2', name: 'Mephiston Red', code: 'MR', brandId: 'pb-1', type: 'Base', notes: null, brand: { name: 'Citadel', slug: 'citadel' } } as Paint,
    ];

    const mockScheme: ColorSchemeFull = {
        id: 'cs-1',
        userId: 'user1',
        name: 'Ultramarines Blue',
        description: 'Classic scheme',
        referencePhotoKey: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        steps: [
            { orderIndex: 1, area: 'Armor', techniqueId: 't-1', paintId: 'p-1', notes: null },
            { orderIndex: 2, area: 'Trim', techniqueId: 't-2', paintId: 'p-2', notes: 'Thin coats' },
        ],
    };

    async function createComponent(
        dialogData: Record<string, unknown> = { mode: 'create' },
        spySetup?: (api: jasmine.SpyObj<ApiService>) => void,
    ) {
        apiSpy = jasmine.createSpyObj('ApiService', [
            'getTechniques', 'getPaints', 'createColorScheme', 'updateColorScheme',
        ]);
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        apiSpy.getTechniques.and.returnValue(of(mockTechniques));
        apiSpy.getPaints.and.returnValue(of(mockPaints));

        if (spySetup) spySetup(apiSpy);

        await TestBed.resetTestingModule().configureTestingModule({
            imports: [SchemeFormDialogComponent, NoopAnimationsModule],
        }).overrideComponent(SchemeFormDialogComponent, {
            set: {
                providers: [
                    { provide: ApiService, useValue: apiSpy },
                    { provide: MAT_DIALOG_DATA, useValue: dialogData },
                    { provide: MatDialogRef, useValue: dialogRefSpy },
                    { provide: MatSnackBar, useValue: snackBarSpy },
                ],
            },
        }).compileComponents();

        fixture = TestBed.createComponent(SchemeFormDialogComponent);
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

        it('should load techniques and paints on init', () => {
            expect(apiSpy.getTechniques).toHaveBeenCalled();
            expect(apiSpy.getPaints).toHaveBeenCalled();
            expect(component.techniques()).toEqual(mockTechniques);
            expect(component.paints()).toEqual(mockPaints);
        });

        it('should initialize with empty form', () => {
            expect(component.form.value.name).toBe('');
            expect(component.form.value.description).toBe('');
            expect(component.stepsArray.length).toBe(0);
        });

        it('should have saving set to false', () => {
            expect(component.saving()).toBeFalse();
        });

        it('should not save when form is invalid (name empty)', () => {
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: 't-1' });
            component.save();
            expect(apiSpy.createColorScheme).not.toHaveBeenCalled();
        });

        it('should not save when steps array is empty', () => {
            component.form.patchValue({ name: 'Valid Name' });
            component.save();
            expect(apiSpy.createColorScheme).not.toHaveBeenCalled();
        });

        it('should call createColorScheme on valid save', () => {
            apiSpy.createColorScheme.and.returnValue(of({} as ColorSchemeFull));
            component.form.patchValue({ name: 'New Scheme', description: 'Desc' });
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: 't-1', paintId: 'p-1' });

            component.save();

            expect(apiSpy.createColorScheme).toHaveBeenCalledWith(jasmine.objectContaining({
                name: 'New Scheme',
                description: 'Desc',
                steps: [jasmine.objectContaining({ orderIndex: 1, area: 'Armor', techniqueId: 't-1', paintId: 'p-1' })],
            }));
            expect(snackBarSpy.open).toHaveBeenCalledWith('Saved!', 'OK', { duration: 3000 });
            expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
        });

        it('should set saving to true during save', () => {
            apiSpy.createColorScheme.and.returnValue(of({} as ColorSchemeFull));
            component.form.patchValue({ name: 'Test' });
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: 't-1' });
            component.save();
            expect(component.saving()).toBeTrue();
        });

        it('should show error snackbar on save failure', () => {
            apiSpy.createColorScheme.and.returnValue(throwError(() => ({ error: { error: 'Name taken' } })));
            component.form.patchValue({ name: 'Test' });
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: 't-1' });
            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Name taken', 'OK', { duration: 5000 });
            expect(component.saving()).toBeFalse();
            expect(dialogRefSpy.close).not.toHaveBeenCalled();
        });

        it('should show generic error when error has no message', () => {
            apiSpy.createColorScheme.and.returnValue(throwError(() => ({})));
            component.form.patchValue({ name: 'Test' });
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: 't-1' });
            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed', 'OK', { duration: 5000 });
        });
    });

    describe('Edit mode', () => {
        beforeEach(async () => {
            await createComponent({ mode: 'edit', scheme: mockScheme });
        });

        it('should populate form with scheme data', () => {
            expect(component.form.value.name).toBe('Ultramarines Blue');
            expect(component.form.value.description).toBe('Classic scheme');
        });

        it('should populate steps from scheme data', () => {
            expect(component.stepsArray.length).toBe(2);
            expect(component.stepsArray.at(0).value.area).toBe('Armor');
            expect(component.stepsArray.at(1).value.area).toBe('Trim');
        });

        it('should call updateColorScheme on save', () => {
            apiSpy.updateColorScheme.and.returnValue(of({} as ColorSchemeFull));
            component.save();

            expect(apiSpy.updateColorScheme).toHaveBeenCalledWith('cs-1', jasmine.objectContaining({
                name: 'Ultramarines Blue',
                steps: jasmine.arrayContaining([
                    jasmine.objectContaining({ orderIndex: 1, area: 'Armor' }),
                    jasmine.objectContaining({ orderIndex: 2, area: 'Trim' }),
                ]),
            }));
            expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
        });

        it('should show error snackbar on update failure', () => {
            apiSpy.updateColorScheme.and.returnValue(throwError(() => ({ error: { error: 'Update failed' } })));
            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Update failed', 'OK', { duration: 5000 });
            expect(component.saving()).toBeFalse();
        });
    });

    describe('Steps management', () => {
        beforeEach(async () => {
            await createComponent();
        });

        it('should add a step', () => {
            component.addStep();
            expect(component.stepsArray.length).toBe(1);
        });

        it('should add multiple steps', () => {
            component.addStep();
            component.addStep();
            component.addStep();
            expect(component.stepsArray.length).toBe(3);
        });

        it('should add a step with default empty values', () => {
            component.addStep();
            const step = component.stepsArray.at(0).value;
            expect(step.area).toBe('');
            expect(step.techniqueId).toBe('');
            expect(step.paintId).toBeNull();
            expect(step.notes).toBe('');
        });

        it('should remove a step by index', () => {
            component.addStep();
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'First' });
            component.stepsArray.at(1).patchValue({ area: 'Second' });

            component.removeStep(0);

            expect(component.stepsArray.length).toBe(1);
            expect(component.stepsArray.at(0).value.area).toBe('Second');
        });

        it('should remove last step', () => {
            component.addStep();
            component.removeStep(0);
            expect(component.stepsArray.length).toBe(0);
        });

        it('should reorder steps via drag-and-drop', () => {
            component.addStep();
            component.addStep();
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'A' });
            component.stepsArray.at(1).patchValue({ area: 'B' });
            component.stepsArray.at(2).patchValue({ area: 'C' });

            const event = { previousIndex: 0, currentIndex: 2 } as CdkDragDrop<unknown>;
            component.reorderStep(event);

            expect(component.stepsArray.at(0).value.area).toBe('B');
            expect(component.stepsArray.at(1).value.area).toBe('C');
            expect(component.stepsArray.at(2).value.area).toBe('A');
        });

        it('should not change order when indices are the same', () => {
            component.addStep();
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'A' });
            component.stepsArray.at(1).patchValue({ area: 'B' });

            const event = { previousIndex: 0, currentIndex: 0 } as CdkDragDrop<unknown>;
            component.reorderStep(event);

            expect(component.stepsArray.at(0).value.area).toBe('A');
            expect(component.stepsArray.at(1).value.area).toBe('B');
        });

        it('should assign correct orderIndex in save payload', () => {
            apiSpy.createColorScheme.and.returnValue(of({} as ColorSchemeFull));
            component.form.patchValue({ name: 'Test' });
            component.addStep();
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Base', techniqueId: 't-1' });
            component.stepsArray.at(1).patchValue({ area: 'Highlight', techniqueId: 't-2' });
            component.save();

            expect(apiSpy.createColorScheme).toHaveBeenCalledWith(jasmine.objectContaining({
                steps: [
                    jasmine.objectContaining({ orderIndex: 1, area: 'Base' }),
                    jasmine.objectContaining({ orderIndex: 2, area: 'Highlight' }),
                ],
            }));
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

        it('should have invalid step when area is empty', () => {
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: '', techniqueId: 't-1' });
            expect(component.stepsArray.at(0).invalid).toBeTrue();
        });

        it('should have invalid step when techniqueId is empty', () => {
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: '' });
            expect(component.stepsArray.at(0).invalid).toBeTrue();
        });

        it('should have valid step when area and techniqueId are filled', () => {
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: 'Armor', techniqueId: 't-1' });
            expect(component.stepsArray.at(0).valid).toBeTrue();
        });

        it('should not save when a step has invalid fields', () => {
            component.form.patchValue({ name: 'Test' });
            component.addStep();
            component.stepsArray.at(0).patchValue({ area: '', techniqueId: '' });
            component.save();
            expect(apiSpy.createColorScheme).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should show error snackbar when getTechniques fails', async () => {
            await createComponent({ mode: 'create' }, (api) => {
                api.getTechniques.and.returnValue(throwError(() => new Error('fail')));
            });
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load techniques', 'OK', { duration: 3000 });
        });

        it('should show error snackbar when getPaints fails', async () => {
            await createComponent({ mode: 'create' }, (api) => {
                api.getPaints.and.returnValue(throwError(() => new Error('fail')));
            });
            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load paints', 'OK', { duration: 3000 });
        });
    });
});

