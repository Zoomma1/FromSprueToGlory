import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { JwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';
import { computed } from '@angular/core';

describe('JwtInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let authStub: {
        accessToken: string | null;
        isLoggedIn: ReturnType<typeof computed>;
        refresh: jasmine.Spy;
        logout: jasmine.Spy;
    };

    function setup(token: string | null = 'mock-token') {
        authStub = {
            accessToken: token,
            isLoggedIn: computed(() => !!token),
            refresh: jasmine.createSpy('refresh'),
            logout: jasmine.createSpy('logout'),
        };

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
                { provide: AuthService, useValue: authStub },
            ],
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    }

    afterEach(() => {
        httpMock.verify();
    });

    describe('Token attachment', () => {
        it('should add Authorization header when token exists', () => {
            setup('my-jwt-token');

            http.get('/api/data').subscribe();

            const req = httpMock.expectOne('/api/data');
            expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt-token');
            req.flush({});
        });

        it('should not add Authorization header when token is null', () => {
            setup(null);

            http.get('/api/data').subscribe();

            const req = httpMock.expectOne('/api/data');
            expect(req.request.headers.has('Authorization')).toBeFalse();
            req.flush({});
        });
    });

    describe('Auth URL skipping', () => {
        it('should not add Authorization header for /auth/ URLs', () => {
            setup('my-jwt-token');

            http.get('/api/auth/login').subscribe();

            const req = httpMock.expectOne('/api/auth/login');
            expect(req.request.headers.has('Authorization')).toBeFalse();
            req.flush({});
        });
    });

    describe('401 token refresh', () => {
        it('should refresh token and retry on 401', () => {
            setup('expired-token');
            authStub.refresh.and.returnValue(Promise.resolve('new-token'));

            http.get('/api/data').subscribe();

            const firstReq = httpMock.expectOne('/api/data');
            firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

            setTimeout(() => {
                const retryReq = httpMock.expectOne('/api/data');
                expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
                retryReq.flush({ ok: true });
            });
        });

        it('should logout and rethrow when refresh returns null', () => {
            setup('expired-token');
            authStub.refresh.and.returnValue(Promise.resolve(null));

            http.get('/api/data').subscribe({
                error: (err) => {
                    expect(err.status).toBe(401);
                },
            });

            const firstReq = httpMock.expectOne('/api/data');
            firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

            setTimeout(() => {
                expect(authStub.logout).toHaveBeenCalled();
            });
        });
    });

    describe('Non-401 errors', () => {
        it('should rethrow non-401 errors without refreshing', () => {
            setup('my-jwt-token');

            http.get('/api/data').subscribe({
                error: (err) => {
                    expect(err.status).toBe(500);
                },
            });

            const req = httpMock.expectOne('/api/data');
            req.flush(null, { status: 500, statusText: 'Internal Server Error' });

            expect(authStub.refresh).not.toHaveBeenCalled();
            expect(authStub.logout).not.toHaveBeenCalled();
        });
    });
});
