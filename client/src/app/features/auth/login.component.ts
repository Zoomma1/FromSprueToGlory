// ──────────────────────────────────────────────────────────
// 🔐 Login Component
// ──────────────────────────────────────────────────────────
// KEY CONCEPTS:
//   - Reactive Forms: FormGroup + FormControl with validators
//   - inject(): Angular 19 DI function (replaces constructor injection)
//   - signal(): for error state management
//   - Router navigation after successful login
//
// WHY Reactive Forms instead of Template-Driven?
//   - Better testability (forms are plain TypeScript objects)
//   - Stronger type-checking
//   - Easier to add complex validation
//   - ALTERNATIVE: Template-Driven forms with ngModel (simpler but less control)
//
// 🎯 MINI-EXERCISE: Add a "Remember me" checkbox that stores
//    the email in localStorage for next visit.
// ──────────────────────────────────────────────────────────

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ReactiveFormsModule, RouterLink,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    ],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    form: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
    });

    hidePassword = signal(true);
    loading = signal(false);
    error = signal('');

    async onSubmit() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set('');

        try {
            await this.authService.login(this.form.value.email, this.form.value.password);
            this.router.navigate(['/dashboard']);
        } catch (err: unknown) {
            const error = err as { error?: { error?: string } };
            this.error.set(error?.error?.error || 'Login failed');
        } finally {
            this.loading.set(false);
        }
    }
}
