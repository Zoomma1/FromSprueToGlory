import { ColorSchemesListComponent } from './color-schemes-list.component';
import { ApiService } from '../../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorScheme } from '../../../classes/color-scheme';
import { of, throwError } from 'rxjs';

describe('ColorSchemesListComponent', () => {
  let component: ColorSchemesListComponent;
  let fixture: ComponentFixture<ColorSchemesListComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockColorSchemes: ColorScheme[] = [
    { id: '1', name: 'Scheme 1', description: 'Description 1', _count: { steps: 3, items: 1 } } as ColorScheme,
    { id: '2', name: 'Scheme 2', description: 'Description 2', _count: { steps: 5, items: 2 } } as ColorScheme,
  ];

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getColorSchemes', 'deleteColorScheme']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [ColorSchemesListComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ]
    }).overrideComponent(ColorSchemesListComponent, {
      set: {
        providers: [
          { provide: ApiService, useValue: apiServiceSpy },
          { provide: Router, useValue: routerSpy },
          { provide: MatSnackBar, useValue: snackBarSpy },
        ]
      }
    });

    apiServiceSpy.getColorSchemes.and.returnValue(of(mockColorSchemes));

    fixture = TestBed.createComponent(ColorSchemesListComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Initialization', () => {
    it('should load color schemes on init', () => {
      apiServiceSpy.getColorSchemes.and.returnValue(of(mockColorSchemes));
      component.ngOnInit();
      expect(apiServiceSpy.getColorSchemes).toHaveBeenCalled();
      expect(component.schemes()).toEqual(mockColorSchemes);
    });
  });

  describe('Load Schemes', () => {
    it('should load color schemes', () => {
      apiServiceSpy.getColorSchemes.and.returnValue(of(mockColorSchemes));
      component.loadSchemes();
      expect(apiServiceSpy.getColorSchemes).toHaveBeenCalled();
      expect(component.schemes()).toEqual(mockColorSchemes);
    });

    it('should display step count from _count.steps', () => {
      apiServiceSpy.getColorSchemes.and.returnValue(of(mockColorSchemes));
      component.loadSchemes();
      expect(component.schemes()[0]._count?.steps).toEqual(3);
      expect(component.schemes()[1]._count?.steps).toEqual(5);
    });

    it('should handle empty color schemes', () => {
      apiServiceSpy.getColorSchemes.and.returnValue(of([]));
      component.loadSchemes();
      expect(apiServiceSpy.getColorSchemes).toHaveBeenCalled();
      expect(component.schemes()).toEqual([]);
    });
  });

  describe('Create Scheme', () => {
    it('should navigate to the new scheme page', () => {
      component.createScheme();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes', 'new']);
    });
  });

  describe('Edit Scheme', () => {
    it('should navigate to the scheme detail page on edit mode', () => {
        const scheme = mockColorSchemes[0];
        component.editScheme(scheme);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/color-schemes', 'edit', scheme.id]);
    });
  });

  describe('Delete Scheme', () => {
    it('should delete the scheme after confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const scheme = mockColorSchemes[0];
      apiServiceSpy.deleteColorScheme.and.returnValue(of(undefined));

      component.deleteScheme(scheme);

      expect(window.confirm).toHaveBeenCalledWith(`Delete "${scheme.name}"?`);
      expect(apiServiceSpy.deleteColorScheme).toHaveBeenCalledWith(scheme.id);
      expect(snackBarSpy.open).toHaveBeenCalledWith('Scheme deleted', 'OK', { duration: 3000 });
    });

    it('should reload schemes after successful deletion', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const scheme = mockColorSchemes[0];
      apiServiceSpy.deleteColorScheme.and.returnValue(of(undefined));

      apiServiceSpy.getColorSchemes.calls.reset();
      component.deleteScheme(scheme);

      expect(apiServiceSpy.getColorSchemes).toHaveBeenCalledTimes(1);
    });

    it('should not delete the scheme if confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      const scheme = mockColorSchemes[0];

      component.deleteScheme(scheme);

      expect(window.confirm).toHaveBeenCalledWith(`Delete "${scheme.name}"?`);
      expect(apiServiceSpy.deleteColorScheme).not.toHaveBeenCalled();
      expect(snackBarSpy.open).not.toHaveBeenCalled();
    });

    it('should not call the API if confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      const scheme = mockColorSchemes[0];

      component.deleteScheme(scheme);

      expect(window.confirm).toHaveBeenCalledWith(`Delete "${scheme.name}"?`);
      expect(apiServiceSpy.deleteColorScheme).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error snackbar when loadSchemes fails', () => {
      apiServiceSpy.getColorSchemes.and.returnValue(throwError(() => new Error('fail')));
      component.loadSchemes();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load color schemes', 'OK', { duration: 3000 });
    });

    it('should show error snackbar when deleteColorScheme fails', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const scheme = mockColorSchemes[0];
      apiServiceSpy.deleteColorScheme.and.returnValue(throwError(() => new Error('fail')));
      component.deleteScheme(scheme);
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to delete scheme', 'OK', { duration: 3000 });
    });
  });
});
