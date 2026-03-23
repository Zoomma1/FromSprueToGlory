// ──────────────────────────────────────────────────────────
// OAuth Callback Component
// ──────────────────────────────────────────────────────────
// Loaded at /auth/callback after the Google OAuth redirect.
//
// FLOW:
//   1. Backend sets oauth_tokens cookie and redirects here
//   2. This component calls GET /auth/session (cookie sent automatically)
//   3. Backend returns tokens + clears the cookie
//   4. Tokens are stored via AuthService → redirect to dashboard
//
// WHY a dedicated component instead of a guard?
//   A component can show a loading state and handle errors gracefully.
//   A guard would redirect silently, making debugging harder.
// ──────────────────────────────────────────────────────────

import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-auth-callback',
    standalone: true,
    template: ``,
})
export class AuthCallbackComponent implements OnInit {
    private authService = inject(AuthService);
    private router = inject(Router);

    async ngOnInit() {
        try {
            await this.authService.handleOAuthCallback();
            this.router.navigate(['/dashboard']);
        } catch {
            this.router.navigate(['/auth/login']);
        }
    }
}
