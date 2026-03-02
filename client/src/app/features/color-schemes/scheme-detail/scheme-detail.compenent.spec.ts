import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchemeDetailComponent } from './scheme-detail.component';
import { ApiService } from '../../../core/services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ColorSchemeFull, ColorScheme, ColorSchemeStepFull } from '../../../classes/color-scheme';

describe('SchemeDetailComponent', () => {
  let component: SchemeDetailComponent;
  let fixture: ComponentFixture<SchemeDetailComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockSteps: ColorSchemeStepFull[] = [
    { orderIndex: 1, area: 'Base', techniqueId: 't1', paintId: 'p1', notes: 'base coat' },
    { orderIndex: 2, area: 'Highlight', techniqueId: 't2', paintId: null, notes: null, technique: { id: 't2', name: 'Drybrush' } as never, paint: { id: 'p2', name: 'White' } as never },
  ];

  const mockScheme: ColorSchemeFull = {
    id: '1',
    name: 'Test Scheme',
    description: 'A test color scheme',
    steps: [],
    userId: 'user1',
    referencePhotoKey: 'photo1',
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
  };

  const mockSchemeWithSteps: ColorSchemeFull = { ...mockScheme, steps: mockSteps };

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getColorScheme', 'getTechniques', 'getPaints',
      'updateColorScheme', 'createColorScheme', 'deleteColorScheme',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    const activatedRouteStub = {
      snapshot: { paramMap: { get: (key: string) => key === 'id' ? '1' : null } }
    };

    TestBed.configureTestingModule({
      imports: [SchemeDetailComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ]
    }).overrideComponent(SchemeDetailComponent, {
      set: {
        providers: [
          { provide: ApiService, useValue: apiServiceSpy },
          { provide: ActivatedRoute, useValue: activatedRouteStub },
          { provide: Router, useValue: routerSpy },
          { provide: MatSnackBar, useValue: snackBarSpy },
        ]
      }
    });

    apiServiceSpy.getColorScheme.and.returnValue(of(mockScheme));
    apiServiceSpy.getTechniques.and.returnValue(of([]));
    apiServiceSpy.getPaints.and.returnValue(of([]));

    fixture = TestBed.createComponent(SchemeDetailComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Initialization', () => {
    it('should load the color scheme on init', () => {
      component.ngOnInit();
      expect(apiServiceSpy.getColorScheme).toHaveBeenCalledWith('1');
      expect(component.scheme()).toEqual(mockScheme);
    });
  });

  describe('loadScheme', () => {
    it('should reload using scheme signal id when no argument is passed', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.getColorScheme.calls.reset();
      component.loadScheme();
      expect(apiServiceSpy.getColorScheme).toHaveBeenCalledWith('1');
    });

    it('should do nothing when no argument and scheme is null', () => {
      component.scheme.set(null);
      apiServiceSpy.getColorScheme.calls.reset();
      component.loadScheme();
      expect(apiServiceSpy.getColorScheme).not.toHaveBeenCalled();
    });
  });

  describe('Toggle Details', () => {
    it('should toggle the showDetails signal', () => {
      expect(component.showDetails()).toBeFalse();
      component.toggleDetails();
      expect(component.showDetails()).toBeTrue();
      component.toggleDetails();
      expect(component.showDetails()).toBeFalse();
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode and load techniques and paints', () => {
      component.scheme.set(mockScheme);
      component.enterEditMode();
      expect(apiServiceSpy.getTechniques).toHaveBeenCalled();
      expect(apiServiceSpy.getPaints).toHaveBeenCalled();
      expect(component.editMode()).toBeTrue();
    });

    it('should populate the form with scheme data', () => {
      component.scheme.set(mockScheme);
      component.enterEditMode();
      expect(component.form.value.name).toBe('Test Scheme');
      expect(component.form.value.description).toBe('A test color scheme');
    });

    it('should populate stepsArray with existing steps', () => {
      component.scheme.set(mockSchemeWithSteps);
      component.enterEditMode();
      expect(component.stepsArray.length).toBe(2);
      expect(component.stepsArray.at(0).value.area).toBe('Base');
      expect(component.stepsArray.at(1).value.area).toBe('Highlight');
    });

    it('should do nothing when scheme is null', () => {
      component.scheme.set(null);
      component.enterEditMode();
      expect(component.editMode()).toBeFalse();
      expect(apiServiceSpy.getTechniques).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Edit', () => {
    it('should exit edit mode', () => {
      component.editMode.set(true);
      component.cancelEdit();
      expect(component.editMode()).toBeFalse();
    });
  });

  describe('Step management', () => {
    it('should add a step to the form array', () => {
      const initialLength = component.stepsArray.length;
      component.addStep();
      expect(component.stepsArray.length).toBe(initialLength + 1);
    });

    it('should remove a step from the form array', () => {
      component.addStep();
      component.addStep();
      expect(component.stepsArray.length).toBe(2);
      component.removeStep(0);
      expect(component.stepsArray.length).toBe(1);
    });

    it('should reorder steps in the form array', () => {
      component.addStep();
      component.addStep();
      component.stepsArray.at(0).patchValue({ area: 'First' });
      component.stepsArray.at(1).patchValue({ area: 'Second' });

      component.reorderStep({ previousIndex: 0, currentIndex: 1 } as never);

      expect(component.stepsArray.at(0).value.area).toBe('Second');
      expect(component.stepsArray.at(1).value.area).toBe('First');
    });
  });

  describe('Step group creation', () => {
    it('should create a step group with default values', () => {
      const group = component['createStepGroup']();
      expect(group.value).toEqual({ area: '', techniqueId: '', paintId: null, notes: '' });
    });

    it('should create a step group with provided values', () => {
      const stepData = { area: 'Test Area', techniqueId: 'tech1', paintId: 'paint1', notes: 'Test Notes' };
      const group = component['createStepGroup'](stepData as never);
      expect(group.value).toEqual(stepData);
    });

    it('should create a step group with partial values', () => {
      const stepData = { area: 'Test Area', techniqueId: 'tech1' };
      const group = component['createStepGroup'](stepData as never);
      expect(group.value).toEqual({ area: 'Test Area', techniqueId: 'tech1', paintId: null, notes: '' });
    });

    it('should fallback null notes to empty string', () => {
      const stepData = { area: 'Test Area', techniqueId: 'tech1', paintId: null, notes: null };
      const group = component['createStepGroup'](stepData as never);
      expect(group.value.notes).toBe('');
    });
  });

  describe('Save', () => {
    it('should not save if form is invalid', () => {
      component.form.setErrors({ invalid: true });
      component.save();
      expect(apiServiceSpy.updateColorScheme).not.toHaveBeenCalled();
    });

    it('should not save if there are no steps', () => {
      component.form.patchValue({ name: 'Test Scheme' });
      component.stepsArray.clear();
      component.save();
      expect(apiServiceSpy.updateColorScheme).not.toHaveBeenCalled();
    });

    it('should call updateColorScheme with correct payload', () => {
      component.scheme.set(mockScheme);
      component.form.patchValue({ name: 'Updated Name', description: 'Updated Desc' });
      component.stepsArray.push(component['createStepGroup']({ area: 'Base', techniqueId: 'tech1' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(of(new ColorScheme()));

      component.save();

      expect(apiServiceSpy.updateColorScheme).toHaveBeenCalledWith('1', jasmine.objectContaining({
        name: 'Updated Name',
        description: 'Updated Desc',
        steps: [jasmine.objectContaining({ orderIndex: 1, area: 'Base', techniqueId: 'tech1' })],
      }));
    });

    it('should show snackBar, exit edit mode and reload on success', () => {
      component.scheme.set(mockScheme);
      component.form.patchValue({ name: 'Test' });
      component.stepsArray.push(component['createStepGroup']({ area: 'A', techniqueId: 't' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(of(new ColorScheme()));
      component.editMode.set(true);
      component.saving.set(true);

      component.save();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Saved!', 'OK', { duration: 3000 });
      expect(component.editMode()).toBeFalse();
      expect(component.saving()).toBeFalse();
    });

    it('should show error snackBar and reset saving on failure', () => {
      component.scheme.set(mockScheme);
      component.form.patchValue({ name: 'Test' });
      component.stepsArray.push(component['createStepGroup']({ area: 'A', techniqueId: 't' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(throwError(() => ({ error: { error: 'Server error' } })));

      component.save();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Server error', 'OK', { duration: 5000 });
      expect(component.saving()).toBeFalse();
    });

    it('should show generic error when error has no message', () => {
      component.scheme.set(mockScheme);
      component.form.patchValue({ name: 'Test' });
      component.stepsArray.push(component['createStepGroup']({ area: 'A', techniqueId: 't' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(throwError(() => ({})));

      component.save();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed', 'OK', { duration: 5000 });
    });
  });

  describe('Duplicate', () => {
    it('should call createColorScheme with (copy) name and navigate', () => {
      component.scheme.set(mockScheme);
      const newScheme: ColorSchemeFull = { ...mockScheme, id: '2', name: 'Test Scheme (copy)' };
      apiServiceSpy.createColorScheme.and.returnValue(of(newScheme));

      component.duplicate();

      expect(apiServiceSpy.createColorScheme).toHaveBeenCalledWith(jasmine.objectContaining({
        name: 'Test Scheme (copy)',
        description: 'A test color scheme',
      }));
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes', '2']);
    });

    it('should show Duplicated snackBar on success', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.createColorScheme.and.returnValue(of({ ...mockScheme, id: '2' }));

      component.duplicate();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Duplicated!', 'OK', { duration: 3000 });
    });

    it('should map steps with fallback techniqueId and paintId', () => {
      const schemeWithNestedRefs: ColorSchemeFull = {
        ...mockScheme,
        steps: [
          { orderIndex: 1, area: 'Armor', techniqueId: '', paintId: null, technique: { id: 'tech-fallback', name: 'Wash' } as never, paint: { id: 'paint-fallback', name: 'Nuln Oil' } as never, notes: null },
        ],
      };
      component.scheme.set(schemeWithNestedRefs);
      apiServiceSpy.createColorScheme.and.returnValue(of({ ...mockScheme, id: '3' }));

      component.duplicate();

      expect(apiServiceSpy.createColorScheme).toHaveBeenCalledWith(jasmine.objectContaining({
        steps: [jasmine.objectContaining({
          techniqueId: 'tech-fallback',
          paintId: 'paint-fallback',
        })],
      }));
    });

    it('should not duplicate if scheme is null', () => {
      component.scheme.set(null);
      component.duplicate();
      expect(apiServiceSpy.createColorScheme).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should show error snackBar on failure', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.createColorScheme.and.returnValue(throwError(() => ({ error: { error: 'Duplicate name' } })));

      component.duplicate();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Duplicate name', 'OK', { duration: 5000 });
    });

    it('should show generic error when error has no message', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.createColorScheme.and.returnValue(throwError(() => ({})));

      component.duplicate();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed', 'OK', { duration: 5000 });
    });
  });

  describe('Delete', () => {
    it('should delete and show snackBar on confirmation', () => {
      component.scheme.set(mockScheme);
      spyOn(window, 'confirm').and.returnValue(true);
      apiServiceSpy.deleteColorScheme.and.returnValue(of(undefined));

      component.deleteScheme();

      expect(window.confirm).toHaveBeenCalledWith('Delete "Test Scheme"?');
      expect(apiServiceSpy.deleteColorScheme).toHaveBeenCalledWith('1');
      expect(snackBarSpy.open).toHaveBeenCalledWith('Deleted', 'OK', { duration: 3000 });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes']);
    });

    it('should not delete when confirmation is cancelled', () => {
      component.scheme.set(mockScheme);
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteScheme();

      expect(window.confirm).toHaveBeenCalledWith('Delete "Test Scheme"?');
      expect(apiServiceSpy.deleteColorScheme).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Go Back', () => {
    it('should navigate back to the color schemes list', () => {
      component.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes']);
    });
  });
});
