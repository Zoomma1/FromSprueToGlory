// ──────────────────────────────────────────────────────────
// 🔐 Auth Service — JWT Authentication
// ──────────────────────────────────────────────────────────
// Manages login, signup, logout, and token storage.
//
// KEY CONCEPTS:
//   - signal(): Angular 19 reactive primitive for state
//   - computed(): derived state from signals (auto-updates)
//   - HttpClient: Angular's HTTP client for API calls
//   - localStorage: persists tokens across page reloads
//
// WHY signals instead of BehaviorSubject?
//   - Less boilerplate (no .getValue(), .next(), .asObservable())
//   - Better change detection integration in Angular 19
//   - ALTERNATIVE: BehaviorSubject + async pipe (classic RxJS pattern)
//
// 🎯 MINI-EXERCISE: Add a method `currentUser()` that decodes the
//    JWT access token to extract the user email.
// ──────────────────────────────────────────────────────────

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);

    // Reactive state with signals
    private accessTokenSignal = signal<string | null>(localStorage.getItem('accessToken'));
    private userSignal = signal<{ id: string; email: string } | null>(
        JSON.parse(localStorage.getItem('user') || 'null'),
    );

    // Public computed values
    isLoggedIn = computed(() => !!this.accessTokenSignal());
    user = computed(() => this.userSignal());

    get accessToken(): string | null {
        return this.accessTokenSignal();
    }

    get refreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    }

    async signup(email: string, password: string): Promise<void> {
        const res = await this.http
            .post<AuthResponse>(`${environment.apiUrl}/auth/signup`, { email, password })
            .toPromise();
        if (res) this.storeTokens(res);
    }

    async login(email: string, password: string): Promise<void> {
        const res = await this.http
            .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
            .toPromise();
        if (res) this.storeTokens(res);
    }

    async refresh(): Promise<string | null> {
        const refreshToken = this.refreshToken;
        if (!refreshToken) return null;

        try {
            const res = await this.http
                .post<{ accessToken: string; refreshToken: string }>(
                    `${environment.apiUrl}/auth/refresh`,
                    { refreshToken },
                )
                .toPromise();

            if (res) {
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);
                this.accessTokenSignal.set(res.accessToken);
                return res.accessToken;
            }
        } catch {
            this.logout();
        }
        return null;
    }

    logout(): void {
        const refreshToken = this.refreshToken;
        if (refreshToken) {
            this.http
                .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
                .subscribe({ error: () => { } }); // fire-and-forget
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        this.accessTokenSignal.set(null);
        this.userSignal.set(null);
        this.router.navigate(['/auth/login']);
    }

    private storeTokens(res: AuthResponse): void {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.accessTokenSignal.set(res.accessToken);
        this.userSignal.set(res.user);
    }
}
