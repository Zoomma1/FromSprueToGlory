import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { computed } from '@angular/core';

describe('AuthGuard', () => {
    let routerSpy: jasmine.SpyObj<Router>;
    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = {} as RouterStateSnapshot;

    function setup(loggedIn: boolean) {
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        const authStub = {
            isLoggedIn: computed(() => loggedIn),
        };

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authStub },
                { provide: Router, useValue: routerSpy },
            ],
        });
    }

    it('should allow access when user is authenticated', () => {
        setup(true);
        const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
        expect(result).toBeTrue();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to login when user is not authenticated', () => {
        setup(false);
        const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
        expect(result).toBeFalse();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
});
