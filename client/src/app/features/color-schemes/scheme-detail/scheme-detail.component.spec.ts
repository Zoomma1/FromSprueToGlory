import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchemeDetailComponent, ADD_PAINT_SENTINEL } from './scheme-detail.component';
import { ApiService } from '../../../core/services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ColorSchemeFull, ColorScheme, ColorSchemeStepFull } from '../../../classes/color-scheme';
import { Paint } from '../../../classes/paint';
import { UserCustomPaint } from '../../../classes/user-custom-paint';

describe('SchemeDetailComponent', () => {
  let component: SchemeDetailComponent;
  let fixture: ComponentFixture<SchemeDetailComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let locationSpy: jasmine.SpyObj<Location>;
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

  const mockCustomPaint: UserCustomPaint = {
    id: 'cp-1',
    userId: 'user1',
    name: 'My Custom Red',
    type: 'BASE',
    notes: 'Slightly orange',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getColorScheme', 'getTechniques', 'getPaints', 'getUserCustomPaints',
      'createUserCustomPaint',
      'updateColorScheme', 'createColorScheme', 'deleteColorScheme',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    locationSpy = jasmine.createSpyObj('Location', ['back']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    const activatedRouteStub = {
      snapshot: {
        paramMap: {
          get: (key: string) => {
            if (key === 'mode') return 'view';
            if (key === 'id') return '1';
            return null;
          }
        },
        url: [{ path: 'color-schemes' }, { path: 'view' }, { path: '1' }],
      }
    };

    TestBed.configureTestingModule({
      imports: [SchemeDetailComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ]
    }).overrideComponent(SchemeDetailComponent, {
      set: {
        providers: [
          { provide: ApiService, useValue: apiServiceSpy },
          { provide: ActivatedRoute, useValue: activatedRouteStub },
          { provide: Router, useValue: routerSpy },
          { provide: Location, useValue: locationSpy },
          { provide: MatSnackBar, useValue: snackBarSpy },
        ]
      }
    });

    apiServiceSpy.getColorScheme.and.returnValue(of(mockScheme));
    apiServiceSpy.getTechniques.and.returnValue(of([]));
    apiServiceSpy.getPaints.and.returnValue(of([]));
    apiServiceSpy.getUserCustomPaints.and.returnValue(of([]));

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
    it('should enter edit mode and load techniques, paints, and custom paints', () => {
      component.scheme.set(mockScheme);
      component.enterEditMode();
      expect(apiServiceSpy.getTechniques).toHaveBeenCalled();
      expect(apiServiceSpy.getPaints).toHaveBeenCalled();
      expect(apiServiceSpy.getUserCustomPaints).toHaveBeenCalled();
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

    it('should load userCustomPaintId into paintId when step has a custom paint', () => {
      const stepData = { area: 'Armor', techniqueId: 'tech1', userCustomPaintId: 'cp-1', paintId: null };
      const group = component['createStepGroup'](stepData as never);
      expect(group.value.paintId).toBe('cp-1');
    });

    it('should prefer paintId over userCustomPaintId when both are present', () => {
      const stepData = { area: 'Armor', techniqueId: 'tech1', paintId: 'p-1', userCustomPaintId: 'cp-1' };
      const group = component['createStepGroup'](stepData as never);
      expect(group.value.paintId).toBe('p-1');
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

    it('should call updateColorScheme with correct payload for a reference paint', () => {
      component.scheme.set(mockScheme);
      component.form.patchValue({ name: 'Updated Name', description: 'Updated Desc' });
      component.stepsArray.push(component['createStepGroup']({ area: 'Base', techniqueId: 'tech1', paintId: 'p-1' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(of(new ColorScheme()));

      component.save();

      expect(apiServiceSpy.updateColorScheme).toHaveBeenCalledWith('1', jasmine.objectContaining({
        steps: [jasmine.objectContaining({ orderIndex: 1, area: 'Base', paintId: 'p-1', userCustomPaintId: null })],
      }));
    });

    it('should route custom paint to userCustomPaintId and null paintId in payload', () => {
      component.scheme.set(mockScheme);
      component.customPaints.set([mockCustomPaint]);
      component.form.patchValue({ name: 'Test' });
      component.stepsArray.push(component['createStepGroup']({ area: 'Armor', techniqueId: 'tech1', paintId: 'cp-1' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(of(new ColorScheme()));

      component.save();

      expect(apiServiceSpy.updateColorScheme).toHaveBeenCalledWith('1', jasmine.objectContaining({
        steps: [jasmine.objectContaining({ paintId: null, userCustomPaintId: 'cp-1' })],
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

    it('should reload scheme after successful save', () => {
      component.scheme.set(mockScheme);
      component.form.patchValue({ name: 'Test' });
      component.stepsArray.push(component['createStepGroup']({ area: 'A', techniqueId: 't' } as never));
      apiServiceSpy.updateColorScheme.and.returnValue(of(new ColorScheme()));

      apiServiceSpy.getColorScheme.calls.reset();
      component.save();

      expect(apiServiceSpy.getColorScheme).toHaveBeenCalledWith('1');
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
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes', 'view', '2']);
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

    it('should map steps with direct techniqueId without fallback', () => {
      const schemeWithDirectIds: ColorSchemeFull = {
        ...mockScheme,
        steps: [
          { orderIndex: 1, area: 'Cloak', techniqueId: 'tech-direct', paintId: 'paint-direct', notes: 'two thin coats' },
        ],
      };
      component.scheme.set(schemeWithDirectIds);
      apiServiceSpy.createColorScheme.and.returnValue(of({ ...mockScheme, id: '4' }));

      component.duplicate();

      expect(apiServiceSpy.createColorScheme).toHaveBeenCalledWith(jasmine.objectContaining({
        steps: [jasmine.objectContaining({
          techniqueId: 'tech-direct',
          paintId: 'paint-direct',
          notes: 'two thin coats',
        })],
      }));
    });

    it('should preserve userCustomPaintId when duplicating a step with a custom paint', () => {
      const schemeWithCustomPaint: ColorSchemeFull = {
        ...mockScheme,
        steps: [
          { orderIndex: 1, area: 'Armor', techniqueId: 'tech1', paintId: null, userCustomPaintId: 'cp-1', notes: null },
        ],
      };
      component.scheme.set(schemeWithCustomPaint);
      apiServiceSpy.createColorScheme.and.returnValue(of({ ...mockScheme, id: '5' }));

      component.duplicate();

      expect(apiServiceSpy.createColorScheme).toHaveBeenCalledWith(jasmine.objectContaining({
        steps: [jasmine.objectContaining({ userCustomPaintId: 'cp-1', paintId: null })],
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
    it('should call location.back() when not in edit mode', () => {
      component.editMode.set(false);
      component.goBack();
      expect(locationSpy.back).toHaveBeenCalled();
    });

    it('should call location.back() when in edit mode with no dirty form', () => {
      component.editMode.set(true);
      component.goBack();
      expect(locationSpy.back).toHaveBeenCalled();
    });

    it('should warn and go back when user confirms leaving with unsaved changes', () => {
      component.editMode.set(true);
      component.form.markAsDirty();
      spyOn(window, 'confirm').and.returnValue(true);
      component.goBack();
      expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave without saving?');
      expect(locationSpy.back).toHaveBeenCalled();
    });

    it('should not go back when user cancels leaving with unsaved changes', () => {
      component.editMode.set(true);
      component.form.markAsDirty();
      spyOn(window, 'confirm').and.returnValue(false);
      component.goBack();
      expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave without saving?');
      expect(locationSpy.back).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error snackbar when loadScheme fails', () => {
      apiServiceSpy.getColorScheme.and.returnValue(throwError(() => new Error('fail')));
      component.loadScheme('1');
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load scheme', 'OK', { duration: 3000 });
    });

    it('should show error snackbar when getTechniques fails in enterEditMode', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.getTechniques.and.returnValue(throwError(() => new Error('fail')));
      component.enterEditMode();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load techniques', 'OK', { duration: 3000 });
    });

    it('should show error snackbar when getPaints fails in enterEditMode', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.getPaints.and.returnValue(throwError(() => new Error('fail')));
      component.enterEditMode();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load paints', 'OK', { duration: 3000 });
    });

    it('should show error snackbar when getUserCustomPaints fails in enterEditMode', () => {
      component.scheme.set(mockScheme);
      apiServiceSpy.getUserCustomPaints.and.returnValue(throwError(() => new Error('fail')));
      component.enterEditMode();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load custom paints', 'OK', { duration: 3000 });
    });
  });

  describe('Area filter', () => {
    describe('Initialization', () => {
      it('should have no area filter by default', () => {
        expect(component.availableAreas).toEqual([]);
        expect(component.areaFilter()).toBe('')
      });

      it('should load all steps on initialization', () => {
        component.scheme.set(mockSchemeWithSteps);
        expect(component.filteredSteps()).toEqual(mockSteps);
      });

      it('should load unique areas from steps into area filter options', () => {
        const schemeWithAreas: ColorSchemeFull = {
          ...mockScheme,
          steps: [
            { orderIndex: 1, area: 'Head', techniqueId: 't1', paintId: 'p1', notes: null },
            { orderIndex: 2, area: 'Body', techniqueId: 't2', paintId: 'p2', notes: null },
            { orderIndex: 3, area: 'Head', techniqueId: 't3', paintId: 'p3', notes: null },
          ],
        };
        component.scheme.set(schemeWithAreas);
        expect(component.availableAreas).toEqual(['Head', 'Body']);
      });

      it('should return empty array for area filter options if there are no steps', () => {
        component.scheme.set({ ...mockScheme, steps: [] });
        expect(component.availableAreas).toEqual([]);
      });
    });

    describe('Filtering', () => {
      it('should return all steps when no area filter is set', () => {
        component.scheme.set(mockSchemeWithSteps);
        component.setAreaFilter('');
        expect(component.filteredSteps()).toEqual(mockSteps);
      });

      it('should return only steps matching the area filter', () => {
        component.scheme.set(mockSchemeWithSteps);
        component.setAreaFilter('Base');
        expect(component.areaFilter()).toBe('Base');
        expect(component.filteredSteps()).toEqual([mockSteps[0]]);
      });

      it('should return empty array when no steps match the area filter', () => {
        component.scheme.set(mockSchemeWithSteps);
        component.setAreaFilter('Nonexistent Area');
        expect(component.filteredSteps()).toEqual([]);
      });
    });

    describe('Reset', () => {
      it('should reset area filter to show all steps', () => {
        component.scheme.set(mockSchemeWithSteps);
        component.setAreaFilter('Base');
        component.resetAreaFilter();
        expect(component.filteredSteps()).toEqual(mockSteps);
      });
    });

    describe('Edge Cases', () => {
      it('should not have duplicate areas in filter options', () => {
        const schemeWithDuplicateAreas: ColorSchemeFull = {
          ...mockScheme,
          steps: [
            { orderIndex: 1, area: 'Arm', techniqueId: 't1', paintId: 'p1', notes: null },
            { orderIndex: 2, area: 'Arm', techniqueId: 't2', paintId: 'p2', notes: null },
            { orderIndex: 3, area: 'Leg', techniqueId: 't3', paintId: 'p3', notes: null },
          ],
        };
        component.scheme.set(schemeWithDuplicateAreas);
        expect(component.availableAreas).toEqual(['Arm', 'Leg']);
      });
    })
  });

  describe('Create Mode', () => {
    it('should enter create mode when route id is "new"', () => {
      component.createMode.set(true);
      component.editMode.set(true);
      component.scheme.set({
        id: '', name: '', description: '', steps: [],
        userId: '', referencePhotoKey: '', createdAt: '', updatedAt: '',
      });
      expect(component.createMode()).toBeTrue();
      expect(component.editMode()).toBeTrue();
      expect(component.scheme()).toBeTruthy();
    });

    it('should call createColorScheme on save in create mode', () => {
      component.createMode.set(true);
      component.editMode.set(true);
      component.scheme.set({
        id: '', name: '', description: '', steps: [],
        userId: '', referencePhotoKey: '', createdAt: '', updatedAt: '',
      });
      component.form.patchValue({ name: 'New Scheme' });
      component.stepsArray.push(component['createStepGroup']({ area: 'Base', techniqueId: 'tech1' } as never));
      const created = { ...mockScheme, id: 'new-id', name: 'New Scheme' };
      apiServiceSpy.createColorScheme.and.returnValue(of(created));

      component.save();

      expect(apiServiceSpy.createColorScheme).toHaveBeenCalled();
      expect(apiServiceSpy.updateColorScheme).not.toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes', 'view', 'new-id']);
    });

    it('should navigate back on cancelEdit in create mode', () => {
      component.createMode.set(true);
      component.cancelEdit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes']);
    });

    it('should not navigate on cancelEdit in edit mode', () => {
      component.createMode.set(false);
      component.editMode.set(true);
      component.cancelEdit();
      expect(component.editMode()).toBeFalse();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Brand Filter', () => {
    const mockPaintsWithBrands = [
      { id: 'p1', name: 'Abaddon Black', brand: { name: 'Citadel', slug: 'citadel' } },
      { id: 'p2', name: 'White Scar', brand: { name: 'Citadel', slug: 'citadel' } },
      { id: 'p3', name: 'Mournfang Brown', brand: { name: 'Vallejo', slug: 'vallejo' } },
    ] as Paint[];

    it('should compute available brands sorted and deduplicated', () => {
      component.paints.set(mockPaintsWithBrands);
      expect(component.availableBrands()).toEqual(['Citadel', 'Vallejo']);
    });

    it('should include "Other" brand when custom paints are loaded', () => {
      component.paints.set(mockPaintsWithBrands);
      component.customPaints.set([mockCustomPaint]);
      expect(component.availableBrands()).toContain('Other');
    });

    it('should always place "Other" brand at the end of the list', () => {
      component.paints.set(mockPaintsWithBrands);
      component.customPaints.set([mockCustomPaint]);
      const brands = component.availableBrands();
      expect(brands[brands.length - 1]).toBe('Other');
    });

    it('should sort non-Other brands alphabetically before Other', () => {
      component.paints.set(mockPaintsWithBrands);
      component.customPaints.set([mockCustomPaint]);
      const brands = component.availableBrands();
      const withoutOther = brands.slice(0, -1);
      expect(withoutOther).toEqual([...withoutOther].sort());
    });

    it('should return empty brands when no paints are loaded', () => {
      component.paints.set([]);
      expect(component.availableBrands()).toEqual([]);
    });

    it('should return empty string for brand filter when not set on a step', () => {
      expect(component.getBrandFilter(0)).toBe('');
    });

    it('should filter displayed paints by brand for a specific step', () => {
      component.paints.set(mockPaintsWithBrands);
      component.onBrandFilterChange('Vallejo', 0);
      expect(component.getDisplayedPaints(0).length).toBe(1);
      expect(component.getDisplayedPaints(0)[0].name).toBe('Mournfang Brown');
    });

    it('should not affect another step when brand filter is set on one step', () => {
      component.paints.set(mockPaintsWithBrands);
      component.onBrandFilterChange('Vallejo', 0);
      expect(component.getDisplayedPaints(1).length).toBe(3);
    });

    it('should show all paints when brand filter is empty for a step', () => {
      component.paints.set(mockPaintsWithBrands);
      component.onBrandFilterChange('', 0);
      expect(component.getDisplayedPaints(0).length).toBe(3);
    });

    it('should combine brand filter and name filter for a step', () => {
      component.paints.set(mockPaintsWithBrands);
      component.onBrandFilterChange('Citadel', 1);
      component.onPaintInput('black');
      expect(component.getDisplayedPaints(1).length).toBe(1);
      expect(component.getDisplayedPaints(1)[0].name).toBe('Abaddon Black');
    });

    it('should return empty list when brand filter matches no paints', () => {
      component.paints.set(mockPaintsWithBrands);
      component.onBrandFilterChange('NonExistentBrand', 0);
      expect(component.getDisplayedPaints(0)).toEqual([]);
    });

    it('should track brand filter independently per step', () => {
      component.paints.set(mockPaintsWithBrands);
      component.onBrandFilterChange('Citadel', 0);
      component.onBrandFilterChange('Vallejo', 1);
      expect(component.getBrandFilter(0)).toBe('Citadel');
      expect(component.getBrandFilter(1)).toBe('Vallejo');
      expect(component.getDisplayedPaints(0).length).toBe(2);
      expect(component.getDisplayedPaints(1).length).toBe(1);
    });
  });

  describe('Paint Autocomplete', () => {
    const mockPaints = [
      { id: 'p1', name: 'Abaddon Black' },
      { id: 'p2', name: 'White Scar' },
      { id: 'p3', name: 'Mephiston Red' },
    ] as Paint[];

    it('should display paint name for a valid paint id', () => {
      component.paints.set(mockPaints);
      expect(component.displayPaintName('p1')).toBe('Abaddon Black');
    });

    it('should return empty string for null paint id', () => {
      component.paints.set(mockPaints);
      expect(component.displayPaintName(null)).toBe('');
    });

    it('should return empty string for unknown paint id', () => {
      component.paints.set(mockPaints);
      expect(component.displayPaintName('unknown')).toBe('');
    });

    it('should display custom paint name for a custom paint id', () => {
      component.customPaints.set([mockCustomPaint]);
      expect(component.displayPaintName('cp-1')).toBe('My Custom Red');
    });

    it('should filter displayed paints by input', () => {
      component.paints.set(mockPaints);
      component.onPaintInput('black');
      expect(component.getDisplayedPaints(0).length).toBe(1);
      expect(component.getDisplayedPaints(0)[0].name).toBe('Abaddon Black');
    });

    it('should show all paints when filter is empty', () => {
      component.paints.set(mockPaints);
      component.paintFilter.set('');
      expect(component.getDisplayedPaints(0).length).toBe(3);
    });

    it('should set paintId on step when paint is selected', () => {
      component.addStep();
      component.onPaintSelected('p1', 0);
      expect(component.stepsArray.at(0).value.paintId).toBe('p1');
    });

    it('should clear paintId on step when clearPaint is called', () => {
      component.addStep();
      component.stepsArray.at(0).patchValue({ paintId: 'p1' });
      component.clearPaint(0);
      expect(component.stepsArray.at(0).value.paintId).toBeNull();
    });

    it('should reset paint filter after selection', () => {
      component.paintFilter.set('black');
      component.addStep();
      component.onPaintSelected('p1', 0);
      expect(component.paintFilter()).toBe('');
    });

    it('should reset paint filter after clearing', () => {
      component.paintFilter.set('black');
      component.addStep();
      component.clearPaint(0);
      expect(component.paintFilter()).toBe('');
    });

    it('should open add paint form instead of selecting when sentinel is chosen', () => {
      component.addStep();
      component.onPaintSelected(ADD_PAINT_SENTINEL, 0);
      expect(component.addingPaintForStep()).toBe(0);
      expect(component.stepsArray.at(0).value.paintId).toBeNull();
    });

    it('should not change paintId when sentinel is selected', () => {
      component.addStep();
      component.stepsArray.at(0).patchValue({ paintId: 'p1' });
      component.onPaintSelected(ADD_PAINT_SENTINEL, 0);
      // paintId is reset to null since sentinel triggers the form, not a paint selection
      expect(component.stepsArray.at(0).value.paintId).toBeNull();
    });
  });

  describe('allPaints computed signal', () => {
    const mockRefPaints = [
      { id: 'p1', name: 'Abaddon Black', brand: { name: 'Citadel', slug: 'citadel' }, isCustom: undefined },
    ] as Paint[];

    it('should return only reference paints when no custom paints loaded', () => {
      component.paints.set(mockRefPaints);
      component.customPaints.set([]);
      expect(component.allPaints().length).toBe(1);
      expect(component.allPaints()[0].name).toBe('Abaddon Black');
    });

    it('should merge reference and custom paints', () => {
      component.paints.set(mockRefPaints);
      component.customPaints.set([mockCustomPaint]);
      expect(component.allPaints().length).toBe(2);
    });

    it('should adapt custom paints to Paint shape with Other brand', () => {
      component.customPaints.set([mockCustomPaint]);
      const adapted = component.allPaints().find(p => p.id === 'cp-1');
      expect(adapted).toBeDefined();
      expect(adapted!.brand.name).toBe('Other');
      expect(adapted!.brand.slug).toBe('other');
      expect(adapted!.isCustom).toBeTrue();
    });

    it('should put reference paints before custom paints', () => {
      component.paints.set(mockRefPaints);
      component.customPaints.set([mockCustomPaint]);
      expect(component.allPaints()[0].name).toBe('Abaddon Black');
      expect(component.allPaints()[1].name).toBe('My Custom Red');
    });
  });

  describe('Add Paint Form', () => {
    it('should set addingPaintForStep when openAddPaintForm is called', () => {
      component.openAddPaintForm(2);
      expect(component.addingPaintForStep()).toBe(2);
    });

    it('should reset the addPaintForm when opening', () => {
      component.addPaintForm.patchValue({ name: 'Old Name', type: 'BASE', notes: 'old' });
      component.openAddPaintForm(0);
      expect(component.addPaintForm.value.name).toBe('');
      expect(component.addPaintForm.value.type).toBeNull();
      expect(component.addPaintForm.value.notes).toBe('');
    });

    it('should clear addingPaintForStep on cancelAddPaint', () => {
      component.addingPaintForStep.set(1);
      component.cancelAddPaint();
      expect(component.addingPaintForStep()).toBeNull();
    });

    it('should reset addPaintForm on cancelAddPaint', () => {
      component.addPaintForm.patchValue({ name: 'Test', type: 'BASE', notes: 'note' });
      component.cancelAddPaint();
      expect(component.addPaintForm.value.name).toBe('');
    });

    it('should not submit when form is invalid (name missing)', () => {
      component.addStep();
      component.addPaintForm.patchValue({ name: '', type: null, notes: '' });
      component.submitCustomPaint(0);
      expect(apiServiceSpy.createUserCustomPaint).not.toHaveBeenCalled();
    });

    it('should call createUserCustomPaint with correct data on submit', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(of(mockCustomPaint));
      component.addStep();
      component.addPaintForm.patchValue({ name: 'My Custom Red', type: 'BASE', notes: 'Slightly orange' });

      component.submitCustomPaint(0);

      expect(apiServiceSpy.createUserCustomPaint).toHaveBeenCalledWith({
        name: 'My Custom Red',
        type: 'BASE',
        notes: 'Slightly orange',
      });
    });

    it('should add the new paint to customPaints and select it for the step', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(of(mockCustomPaint));
      component.customPaints.set([]);
      component.addStep();
      component.addPaintForm.patchValue({ name: 'My Custom Red', type: 'BASE', notes: '' });

      component.submitCustomPaint(0);

      expect(component.customPaints().length).toBe(1);
      expect(component.customPaints()[0].name).toBe('My Custom Red');
      expect(component.stepsArray.at(0).value.paintId).toBe('cp-1');
    });

    it('should close the form and show snackBar on success', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(of(mockCustomPaint));
      component.addStep();
      component.addingPaintForStep.set(0);
      component.addPaintForm.patchValue({ name: 'My Custom Red', type: null, notes: '' });

      component.submitCustomPaint(0);

      expect(component.addingPaintForStep()).toBeNull();
      expect(snackBarSpy.open).toHaveBeenCalledWith('"My Custom Red" added!', 'OK', { duration: 3000 });
    });

    it('should show error snackBar when createUserCustomPaint fails', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(
        throwError(() => ({ error: { error: 'Duplicate name' } })),
      );
      component.addStep();
      component.openAddPaintForm(0);
      component.addPaintForm.patchValue({ name: 'Existing Paint', type: null, notes: '' });

      component.submitCustomPaint(0);

      expect(snackBarSpy.open).toHaveBeenCalledWith('Duplicate name', 'OK', { duration: 5000 });
      // form stays open so user can correct
      expect(component.addingPaintForStep()).toBe(0);
    });

    it('should show generic error when API error has no message', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(throwError(() => ({})));
      component.addStep();
      component.addPaintForm.patchValue({ name: 'Paint', type: null, notes: '' });

      component.submitCustomPaint(0);

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to add paint', 'OK', { duration: 5000 });
    });

    it('should send null for type when not provided', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(of(mockCustomPaint));
      component.addStep();
      component.addPaintForm.patchValue({ name: 'Paint', type: null, notes: '' });

      component.submitCustomPaint(0);

      expect(apiServiceSpy.createUserCustomPaint).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: null }),
      );
    });

    it('should send null for notes when empty', () => {
      apiServiceSpy.createUserCustomPaint.and.returnValue(of(mockCustomPaint));
      component.addStep();
      component.addPaintForm.patchValue({ name: 'Paint', type: null, notes: '' });

      component.submitCustomPaint(0);

      expect(apiServiceSpy.createUserCustomPaint).toHaveBeenCalledWith(
        jasmine.objectContaining({ notes: null }),
      );
    });
  });
});