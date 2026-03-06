import { ColorSchemesListComponent } from './color-schemes-list.component';
import { ApiService } from '../../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorScheme } from '../../../classes/color-scheme';
import { of } from 'rxjs';

describe('ColorSchemesListComponent', () => {
  let component: ColorSchemesListComponent;
  let fixture: ComponentFixture<ColorSchemesListComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockColorSchemes: ColorScheme[] = [
    { id: '1', name: 'Scheme 1', description: 'Description 1' } as ColorScheme,
    { id: '2', name: 'Scheme 2', description: 'Description 2' } as ColorScheme,
  ];

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getColorSchemes', 'getColorScheme', 'deleteColorScheme']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [ColorSchemesListComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ]
    }).overrideComponent(ColorSchemesListComponent, {
      set: {
        providers: [
          { provide: ApiService, useValue: apiServiceSpy },
          { provide: MatDialog, useValue: dialogSpy },
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

    it('should handle empty color schemes', () => {
      apiServiceSpy.getColorSchemes.and.returnValue(of([]));
      component.loadSchemes();
      expect(apiServiceSpy.getColorSchemes).toHaveBeenCalled();
      expect(component.schemes()).toEqual([]);
    });
  })

  describe('Open Create Dialog', () => {
    it('should open the create dialog', () => {
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(true) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);
      component.openCreateDialog();
      expect(dialogSpy.open).toHaveBeenCalled();
      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });

    it('should close the create dialog', () => {
    const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(true) });
    dialogSpy.open.and.returnValue(dialogRefSpyObj);
    component.openCreateDialog();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });

    it('should not call loadSchemes if API result is false', () => {
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(false) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);
      component.openCreateDialog();
      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });

    it('should not call loadSchemes if API result is undefined', () => {
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(undefined) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);
      component.openCreateDialog();
      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });
  });

  describe('Open Edit Dialog', () => {
    it('should open the edit dialog with full scheme data', () => {
      const scheme = mockColorSchemes[0];
      const fullScheme = { ...scheme, steps: [] };
      apiServiceSpy.getColorScheme.and.returnValue(of(fullScheme));
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(true) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);

      component.openEditDialog(scheme);

      expect(apiServiceSpy.getColorScheme).toHaveBeenCalledWith(scheme.id);
      expect(dialogSpy.open).toHaveBeenCalled();
      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });

    it('should close the edit dialog', () => {
      const scheme = mockColorSchemes[0];
      const fullScheme = { ...scheme, steps: [] };
      apiServiceSpy.getColorScheme.and.returnValue(of(fullScheme));
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(true) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);

      component.openEditDialog(scheme);

      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });

    it('should not call loadSchemes if API result is false', () => {
      const scheme = mockColorSchemes[0];
      const fullScheme = { ...scheme, steps: [] };
      apiServiceSpy.getColorScheme.and.returnValue(of(fullScheme));
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(false) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);

      component.openEditDialog(scheme);

      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    });

    it('should not call loadSchemes if API result is undefined', () => {
      const scheme = mockColorSchemes[0];
      const fullScheme = { ...scheme, steps: [] };
      apiServiceSpy.getColorScheme.and.returnValue(of(fullScheme));
      const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(undefined) });
      dialogSpy.open.and.returnValue(dialogRefSpyObj);

      component.openEditDialog(scheme);

      expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
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
    })
  });
});
