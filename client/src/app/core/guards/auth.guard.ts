// ──────────────────────────────────────────────────────────
// 🛡️ Auth Guard — Protect routes from unauthenticated access
// ──────────────────────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) {
        return true;
    }

    router.navigate(['/auth/login']);
    return false;
};
