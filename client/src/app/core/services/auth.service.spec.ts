import { AuthService } from './auth.service';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let routerSpy: jasmine.SpyObj<Router>;
    const baseUrl = environment.apiUrl;

    const mockAuthResponse = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        user: { id: 'u1', email: 'test@test.com' }
    };

    function setup(localStorageEntries: Record<string, string> = {}) {
        localStorage.clear();
        Object.entries(localStorageEntries).forEach(([k, v]) => localStorage.setItem(k, v));

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                AuthService,
                { provide: Router, useValue: routerSpy }
            ]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    }

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    describe('Service initialization', () => {
        describe('with empty localStorage', () => {
            beforeEach(() => setup());

            it('should create the service', () => {
                expect(service).toBeTruthy();
            });

            it('should start logged out', () => {
                expect(service.isLoggedIn()).toBeFalse();
                expect(service.user()).toBeNull();
                expect(service.accessToken).toBeNull();
                expect(service.refreshToken).toBeNull();
            });
        });

        describe('with existing tokens in localStorage', () => {
            beforeEach(() => setup({
                accessToken: 'access-123',
                refreshToken: 'refresh-456',
                user: JSON.stringify({ id: 'u1', email: 'test@test.com' })
            }));

            it('should restore logged-in state', () => {
                expect(service.isLoggedIn()).toBeTrue();
                expect(service.user()).toEqual({ id: 'u1', email: 'test@test.com' });
                expect(service.accessToken).toBe('access-123');
                expect(service.refreshToken).toBe('refresh-456');
            });
        });
    });

    describe('signup', () => {
        beforeEach(() => setup());

        it('should POST to /auth/signup and store tokens', async () => {
            const promise = service.signup('test@test.com', 'password123');
            const req = httpMock.expectOne(`${baseUrl}/auth/signup`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ email: 'test@test.com', password: 'password123' });
            req.flush(mockAuthResponse);
            await promise;

            expect(service.accessToken).toBe('access-123');
            expect(service.refreshToken).toBe('refresh-456');
            expect(service.user()).toEqual({ id: 'u1', email: 'test@test.com' });
            expect(service.isLoggedIn()).toBeTrue();
        });

        it('should store tokens in localStorage after signup', async () => {
            const promise = service.signup('test@test.com', 'password123');
            const req = httpMock.expectOne(`${baseUrl}/auth/signup`);
            req.flush(mockAuthResponse);
            await promise;

            expect(localStorage.getItem('accessToken')).toBe('access-123');
            expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
            expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ id: 'u1', email: 'test@test.com' });
        });

        it('should handle signup failure gracefully', async () => {
            const promise = service.signup('test@test.com', 'password123');
            const req = httpMock.expectOne(`${baseUrl}/auth/signup`);
            req.flush(null, { status: 400, statusText: 'Bad Request' });
            await promise;

            expect(service.isLoggedIn()).toBeFalse();
            expect(service.user()).toBeNull();
            expect(service.accessToken).toBeNull();
            expect(service.refreshToken).toBeNull();
        });
    });

    describe('login', () => {
        beforeEach(() => setup());

        it('should POST to /auth/login and store tokens', async () => {
            const promise = service.login('test@test.com', 'password123');
            const req = httpMock.expectOne(`${baseUrl}/auth/login`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ email: 'test@test.com', password: 'password123' });
            req.flush(mockAuthResponse);
            await promise;

            expect(service.accessToken).toBe('access-123');
            expect(service.isLoggedIn()).toBeTrue();
            expect(service.user()).toEqual({ id: 'u1', email: 'test@test.com' });
        });

        it('should store tokens in localStorage after login', async () => {
            const promise = service.login('test@test.com', 'password123');
            const req = httpMock.expectOne(`${baseUrl}/auth/login`);
            req.flush(mockAuthResponse);
            await promise;

            expect(localStorage.getItem('accessToken')).toBe('access-123');
            expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
        });

        it('should handle login failure gracefully', async () => {
            const promise = service.login('test@test.com', 'password123');
            const req = httpMock.expectOne(`${baseUrl}/auth/login`);
            req.flush(null, { status: 401, statusText: 'Unauthorized' });
            await promise;

            expect(service.isLoggedIn()).toBeFalse();
            expect(service.user()).toBeNull();
            expect(service.accessToken).toBeNull();
            expect(service.refreshToken).toBeNull();
        });
    });

    describe('refresh', () => {
        beforeEach(() => setup());

        it('should POST to /auth/refresh with the stored refreshToken', async () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            const promise = service.refresh();
            const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ refreshToken: 'refresh-456' });
            req.flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });
            const token = await promise;

            expect(token).toBe('new-access');
            expect(localStorage.getItem('accessToken')).toBe('new-access');
            expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
        });

        it('should update signals on successful refresh', async () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            const promise = service.refresh();
            const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
            req.flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });
            await promise;

            expect(service.accessToken).toBe('new-access');
            expect(service.isLoggedIn()).toBeTrue();
        });

        it('should return null when no refreshToken exists', async () => {
            const token = await service.refresh();
            expect(token).toBeNull();
        });

        it('should logout on refresh failure', async () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            const promise = service.refresh();
            const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
            req.flush(null, { status: 401, statusText: 'Unauthorized' });
            const token = await promise;

            const logoutReq = httpMock.expectOne(`${baseUrl}/auth/logout`);
            logoutReq.flush(null);

            expect(token).toBeNull();
            expect(service.isLoggedIn()).toBeFalse();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
        });
    });

    describe('logout', () => {
        beforeEach(() => setup());

        it('should POST to /auth/logout when a refreshToken exists', () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            service.logout();
            const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ refreshToken: 'refresh-456' });
            req.flush(null);
        });

        it('should clear localStorage', () => {
            localStorage.setItem('accessToken', 'access-123');
            localStorage.setItem('refreshToken', 'refresh-456');
            localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'test@test.com' }));
            service.logout();
            const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
            req.flush(null);

            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });

        it('should reset signals', () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            service.logout();
            const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
            req.flush(null);

            expect(service.accessToken).toBeNull();
            expect(service.user()).toBeNull();
            expect(service.isLoggedIn()).toBeFalse();
        });

        it('should navigate to /auth/login', () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            service.logout();
            const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
            req.flush(null);

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
        });

        it('should not POST when no refreshToken exists', () => {
            service.logout();
            httpMock.expectNone(`${baseUrl}/auth/logout`);
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
        });

        it('should still clear state when /auth/logout request fails', () => {
            localStorage.setItem('refreshToken', 'refresh-456');
            service.logout();
            const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
            req.flush(null, { status: 500, statusText: 'Server Error' });

            expect(service.isLoggedIn()).toBeFalse();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
        });
    });
});
