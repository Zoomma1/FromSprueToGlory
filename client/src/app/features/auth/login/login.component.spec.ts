import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

@Component({ template: '', standalone: true })
class DummyComponent { }

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['login'], {
            isLoggedIn: false,
            user: null,
            accessToken: null,
            refreshToken: null,
        });

        await TestBed.configureTestingModule({
            imports: [LoginComponent, NoopAnimationsModule],
            providers: [
                provideRouter([{ path: 'dashboard', component: DummyComponent }]),
                provideHttpClient(),
                { provide: AuthService, useValue: authServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
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

        it('should be valid with correct inputs', () => {
            component.form.controls['email'].setValue('test@example.com');
            component.form.controls['password'].setValue('password123');
            expect(component.form.valid).toBeTrue();
        });
    });

    describe('Form submission', () => {
        it('should call AuthService.login on valid submit', async () => {
            authServiceSpy.login.and.returnValue(Promise.resolve());
            component.form.controls['email'].setValue('test@example.com');
            component.form.controls['password'].setValue('password123');

            await component.onSubmit();

            expect(authServiceSpy.login).toHaveBeenCalledWith('test@example.com', 'password123');
        });

        it('should navigate to dashboard on successful login', async () => {
            const routerSpy = spyOn(component['router'], 'navigate');
            authServiceSpy.login.and.returnValue(Promise.resolve());
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            await component.onSubmit();

            expect(routerSpy).toHaveBeenCalledWith(['/dashboard']);
        })

        it('should set error signal on failed login', async () => {
            authServiceSpy.login.and.rejectWith({ error: { error: 'Invalid credentials' } });
            component.form.controls['email'].setValue('test@example.com');
            component.form.controls['password'].setValue('wrongpass1');

            await component.onSubmit();

            expect(component.error()).toBe('Invalid credentials');
        });

        it('should not call AuthService.login if form is invalid', async () => {
            component.form.controls['email'].setValue('invalid-email');
            component.form.controls['password'].setValue('');
            await component.onSubmit();
            expect(authServiceSpy.login).not.toHaveBeenCalled();
        });

        it('should set loading signal during login process', async () => {
            let resolveLogin: () => void;
            authServiceSpy.login.and.returnValue(new Promise((resolve) => (resolveLogin = resolve)));
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            const submitPromise = component.onSubmit();
            expect(component.loading()).toBeTrue();

            resolveLogin!();
            await submitPromise;

            expect(component.loading()).toBeFalse();
        });

        it('should set error signal to generic message if login fails without error details', async () => {
            authServiceSpy.login.and.rejectWith({});
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            await component.onSubmit();

            expect(component.error()).toBe('Login failed');
        });

        it('should set error signal to generic message if login fails with non-standard error response', async () => {
            authServiceSpy.login.and.rejectWith({ error: 'Unexpected error format' });
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            await component.onSubmit();

            expect(component.error()).toBe('Login failed');
        });

        it('should set error signal to generic message if login fails with non-object error response', async () => {
            authServiceSpy.login.and.rejectWith('Server is down');
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            await component.onSubmit();

            expect(component.error()).toBe('Login failed');
        });

        it('should set error signal to generic message if login fails with null error response', async () => {
            authServiceSpy.login.and.rejectWith(null);
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            await component.onSubmit();

            expect(component.error()).toBe('Login failed');
        });

        it('should set error signal to generic message if login fails with undefined error response', async () => {
            authServiceSpy.login.and.rejectWith(undefined);
            component.form.controls['email'].setValue('admin@sprue.dev');
            component.form.controls['password'].setValue('admin');

            await component.onSubmit();

            expect(component.error()).toBe('Login failed');
        });

        it('should clear error signal before retrying submit', async () => {
            authServiceSpy.login.and.rejectWith({ error: { error: 'First error' } });
            component.form.controls['email'].setValue('test@example.com');
            component.form.controls['password'].setValue('password123');
            await component.onSubmit();
            expect(component.error()).toBe('First error');

            authServiceSpy.login.and.returnValue(Promise.resolve());
            const submitPromise = component.onSubmit();
            expect(component.error()).toBe('');
            await submitPromise;
        });
    });

    describe('HidePassword', () => {
        it('should toggle hidePassword signal', () => {
            expect(component.hidePassword()).toBeTrue();
            component.hidePassword.set(false);
            expect(component.hidePassword()).toBeFalse();
        });
    });
});
