import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { computed } from '@angular/core';

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    let authServiceStub: jasmine.SpyObj<AuthService> & { isLoggedIn: ReturnType<typeof computed>; user: ReturnType<typeof computed> };

    function setup(loggedIn = false) {
        authServiceStub = {
            ...jasmine.createSpyObj('AuthService', ['logout']),
            isLoggedIn: computed(() => loggedIn),
            user: computed(() => loggedIn ? { id: 'u1', email: 'test@test.com' } : null),
            accessToken: loggedIn ? 'token' : null,
            refreshToken: loggedIn ? 'refresh' : null,
        } as typeof authServiceStub;

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [AppComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: AuthService, useValue: authServiceStub },
            ],
        }).overrideComponent(AppComponent, {
            set: {
                providers: [
                    { provide: AuthService, useValue: authServiceStub },
                ],
            },
        }).compileComponents();

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    describe('Component initialization', () => {
        beforeEach(() => setup(false));

        it('should create the app', () => {
            expect(component).toBeTruthy();
        });

        it('should set isMobile based on breakpoint observer', () => {
            const breakpointObserver = TestBed.inject(BreakpointObserver);
            spyOn(breakpointObserver, 'observe').and.returnValue(of({ matches: true, breakpoints: {} }));

            component.ngOnInit();
            expect(component.isMobile()).toBeTrue();
        });
    });

    describe('App properties', () => {
        beforeEach(() => setup(false));

        it('should have the correct title', () => {
            expect(component.title).toEqual('From Sprue to Glory');
        });

        it('should have navigation items', () => {
            expect(component.navItems.length).toBeGreaterThan(0);
            expect(component.navItems[0].label).toBe('Dashboard');
        });
    });

    describe('Navigation behavior', () => {
        beforeEach(() => setup(true));

        it('should close sidenav on nav click when mobile', () => {
            component.isMobile.set(true);
            fixture.detectChanges();
            spyOn(component.sidenav, 'close');
            component.onNavClick();
            expect(component.sidenav.close).toHaveBeenCalled();
        });

        it('should not close sidenav on nav click when not mobile', () => {
            component.isMobile.set(false);
            fixture.detectChanges();
            spyOn(component.sidenav, 'close');
            component.onNavClick();
            expect(component.sidenav.close).not.toHaveBeenCalled();
        });
    });

    describe('Auth service', () => {
        beforeEach(() => setup(false));

        it('should have authService injected and accessible', () => {
            expect(component.authService).toBeTruthy();
        });
    });
});
