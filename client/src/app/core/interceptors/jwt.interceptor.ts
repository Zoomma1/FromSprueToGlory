// ──────────────────────────────────────────────────────────
// 📡 JWT Interceptor — Auto-attach tokens to API requests
// ──────────────────────────────────────────────────────────
// Intercepts ALL outgoing HTTP requests and:
//   1. Adds the JWT access token to the Authorization header
//   2. On 401 response: tries to refresh token and retry
//
// WHY an interceptor?
//   - DRY: no need to manually add headers in every service
//   - Automatic token refresh is transparent to the rest of the app
//   - ALTERNATIVE: manually add headers in each HTTP call (error-prone)
// ──────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse,
    HttpContextToken,
} from '@angular/common/http';

import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private authService = inject(AuthService);

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // Skip auth endpoints to avoid infinite loops
        if (req.url.includes('/auth/')) {
            return next.handle(req);
        }

        // Skip S3 presigned URL uploads (no JWT allowed)
        if (req.context.get(SKIP_AUTH)) {
            return next.handle(req);
        }

        // Clone request with token
        const token = this.authService.accessToken;
        const authReq = token
            ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            : req;

        return next.handle(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401 && !req.url.includes('/auth/')) {
                    // Try refresh
                    return from(this.authService.refresh()).pipe(
                        switchMap((newToken) => {
                            if (newToken) {
                                const retryReq = req.clone({
                                    setHeaders: { Authorization: `Bearer ${newToken}` },
                                });
                                return next.handle(retryReq);
                            }
                            this.authService.logout();
                            return throwError(() => error);
                        }),
                    );
                }
                return throwError(() => error);
            }),
        );
    }
}
