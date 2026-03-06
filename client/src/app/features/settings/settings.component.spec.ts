import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { SettingsComponent } from './settings.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { computed } from '@angular/core';
import { Item } from '../../classes/items';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let authServiceStub: Partial<AuthService> & { logout: jasmine.Spy };

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['exportItems', 'deleteAccount']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    authServiceStub = {
      ...jasmine.createSpyObj('AuthService', ['logout']),
      user: computed(() => ({ id: 'u1', email: 'test@test.com' })),
      isLoggedIn: computed(() => true),
    } as Partial<AuthService> & { logout: jasmine.Spy };

    const mockItems: Item[] = [
      { id: '1', name: 'Item 1', status: 'WANT' } as Item,
      { id: '2', name: 'Item 2', status: 'WIP' } as Item,
      { id: '3', name: 'Item 3', status: 'FINISHED' } as Item,
    ];
    const mockData = JSON.parse(JSON.stringify(mockItems));
    apiSpy.exportItems.and.returnValue(of(mockData));

    await TestBed.configureTestingModule({
      imports: [ SettingsComponent ],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).overrideComponent(SettingsComponent, {
      set: {
        providers: [
          { provide: ApiService, useValue: apiSpy },
          { provide: MatSnackBar, useValue: snackBarSpy },
          { provide: AuthService, useValue: authServiceStub }
        ]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialisation', () => {
    it('should create the settings component', () => {
      expect(component).toBeTruthy();
    });

    it('should have AuthService injected', () => {
      expect(component.authService).toBeTruthy();
    });
  });

  describe('Export json', () => {
    it('should call ApiService.exportItems with "json"', () => {
      component.exportJSON();
      expect(apiSpy.exportItems).toHaveBeenCalledWith('json');
    });

    it('should show a snackbar on successful export', () => {
      component.exportJSON();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Downloaded pile-of-shame.json', 'OK', { duration: 3000 });
    });
  });

  describe('Export csv', () => {
    it('should call ApiService.exportItems with "csv"', () => {
      component.exportCSV();
      expect(apiSpy.exportItems).toHaveBeenCalledWith('csv');
    });

    it('should show a snackbar on successful export', () => {
      component.exportCSV();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Downloaded pile-of-shame.csv', 'OK', { duration: 3000 });
    });
  });

  describe('Delete account', () => {
    beforeEach(() => {
      apiSpy.deleteAccount.and.returnValue(of(undefined));
    });

    it('should call ApiService.deleteAccount on double confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.deleteAccount();
      expect(apiSpy.deleteAccount).toHaveBeenCalled();
    });

    it('should not call ApiService.deleteAccount if user cancels first confirm', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.deleteAccount();
      expect(apiSpy.deleteAccount).not.toHaveBeenCalled();
    });

    it('should not call ApiService.deleteAccount if user cancels second confirm', () => {
      spyOn(window, 'confirm').and.returnValues(true, false);
      component.deleteAccount();
      expect(apiSpy.deleteAccount).not.toHaveBeenCalled();
    });

    it('should show a snackbar and logout on successful deletion', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.deleteAccount();
      expect(snackBarSpy.open).toHaveBeenCalledWith('Account deleted', 'OK', { duration: 3000 });
      expect(authServiceStub.logout).toHaveBeenCalled();
    });
  });

  describe('Download', () => {
    it('should create a blob and trigger download', () => {
      const blob = new Blob(['test data'], { type: 'text/plain' });
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
      spyOn(URL, 'revokeObjectURL').and.callThrough();

      component['download'](blob, 'test.txt');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    });
  });
});
