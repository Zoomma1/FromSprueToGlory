// ──────────────────────────────────────────────────────────
// 🧪 Login Component Tests
// ──────────────────────────────────────────────────────────

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

@Component({ template: '', standalone: true })
class DummyComponent { }

import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

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

    it('should create', () => {
        expect(component).toBeTruthy();
    });

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

    it('should call AuthService.login on valid submit', async () => {
        authServiceSpy.login.and.returnValue(Promise.resolve());
        component.form.controls['email'].setValue('test@example.com');
        component.form.controls['password'].setValue('password123');

        await component.onSubmit();

        expect(authServiceSpy.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should set error signal on failed login', async () => {
        authServiceSpy.login.and.rejectWith({ error: { error: 'Invalid credentials' } });
        component.form.controls['email'].setValue('test@example.com');
        component.form.controls['password'].setValue('wrongpass1');

        await component.onSubmit();

        expect(component.error()).toBe('Invalid credentials');
    });
});
