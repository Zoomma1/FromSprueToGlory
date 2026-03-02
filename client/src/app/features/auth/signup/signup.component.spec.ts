import { SignupComponent } from './signup.component';
import { AuthService } from '../../../core/services/auth.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({ template: '', standalone: true })
class DummyComponent { }

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['signup'], {
      isLoggedIn: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });

    await TestBed.configureTestingModule({
      imports: [SignupComponent, NoopAnimationsModule],
      providers: [
        provideRouter([{ path: 'dashboard', component: DummyComponent }]),
        provideHttpClient(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Form initialization and validation', () => {
    it('should have an invalid form initially', () => {
      expect(component.form.valid).toBeFalse();
    });

    it('should mark email invalid for bad format', () => {
      component.form.controls['email'].setValue('not-an-email');
      component.form.controls['email'].markAsTouched();
      expect(component.form.controls['email'].hasError('email')).toBeTrue();
    });

    it('should mark password required', () => {
      component.form.controls['password'].markAsTouched();
      expect(component.form.controls['password'].hasError('required')).toBeTrue();
    });

    it('should validate password strength', () => {
      component.form.controls['password'].setValue('weakpass');
      component.form.controls['password'].markAsTouched();
      expect(component.form.controls['password'].hasError('pattern')).toBeTrue();
    });

    it('should validate password confirmation', () => {
      component.form.controls['password'].setValue('StrongPass1!');
      component.form.controls['confirmPassword'].setValue('Mismatch1!');
      component.form.markAllAsTouched();
      expect(component.form.hasError('passwordsMismatch')).toBeTrue();
    });
  });

  describe('onSubmit', () => {
    it('should call AuthService.signup on valid submit', async () => {
      authServiceSpy.signup.and.returnValue(Promise.resolve());
      component.form.controls['email'].setValue('test@test.test');
      component.form.controls['password'].setValue('Test123!');
      component.form.controls['confirmPassword'].setValue('Test123!')

      await component.onSubmit();

      expect(authServiceSpy.signup).toHaveBeenCalledWith('test@test.test', 'Test123!');
    });

    it('should not call AuthService.signup on invalid form', async () => {
      component.form.controls['email'].setValue('invalid-email');
      component.form.controls['password'].setValue('weak');
      component.form.controls['confirmPassword'].setValue('weak');
      component.form.markAllAsTouched();

      await component.onSubmit();

      expect(authServiceSpy.signup).not.toHaveBeenCalled();
    })

    it('should navigate to dashboard on successful signup', async () => {
      const routerSpy = spyOn(component['router'], 'navigate');
      authServiceSpy.signup.and.returnValue(Promise.resolve());
      component.form.controls['email'].setValue('test@test.test');
      component.form.controls['password'].setValue('Test123!');
      component.form.controls['confirmPassword'].setValue('Test123!');

      await component.onSubmit();

      expect(routerSpy).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should set loading state correctly', async () => {
      authServiceSpy.signup.and.returnValue(new Promise(resolve => setTimeout(resolve, 100)));
      component.form.controls['email'].setValue('test@test.test');
      component.form.controls['password'].setValue('Test123!');
      component.form.controls['confirmPassword'].setValue('Test123!');

      const submitPromise = component.onSubmit();
      expect(component.loading()).toBeTrue();

      await submitPromise;
      expect(component.loading()).toBeFalse();
    })

     it('should set form error on signup failure', async () => {
      authServiceSpy.signup.and.returnValue(Promise.reject({ error: { error: 'Email already exists' } }));
      component.form.controls['email'].setValue('admin@sprue.dev');
      component.form.controls['password'].setValue('Admin123!');
      component.form.controls['confirmPassword'].setValue('Admin123!');

      await component.onSubmit();

      expect(component.error()).toBe('Email already exists');
      expect(component.form.hasError('Conflict')).toBeTrue();
     });

     it('should set generic error message if signup fails without specific error', async () => {
      authServiceSpy.signup.and.returnValue(Promise.reject({}));
      component.form.controls['email'].setValue('test@test.test');
      component.form.controls['password'].setValue('Test123!');
      component.form.controls['confirmPassword'].setValue('Test123!');

      await component.onSubmit();

      expect(component.error()).toBe('Signup failed');
      expect(component.form.hasError('Conflict')).toBeTrue();
     });

     it('should not have pattern error if password meets strength requirements', () => {
      component.form.controls['password'].setValue('StrongPass1!');
      component.form.controls['password'].markAsTouched();
      expect(component.form.controls['password'].hasError('pattern')).toBeFalse();
     });

     it('should not have passwordsMismatch error if passwords match', () => {
      component.form.controls['password'].setValue('StrongPass1!');
      component.form.controls['confirmPassword'].setValue('StrongPass1!');
      component.form.markAllAsTouched();
      expect(component.form.hasError('passwordsMismatch')).toBeFalse();
     });

     it('should not have errors if form is valid', () => {
      component.form.controls['email'].setValue('test@test.test');
      component.form.controls['password'].setValue('Test123!');
      component.form.controls['confirmPassword'].setValue('Test123!');
      component.form.markAllAsTouched();
      expect(component.form.valid).toBeTrue();
      expect(component.form.errors).toBeNull();
     });
  })

})
