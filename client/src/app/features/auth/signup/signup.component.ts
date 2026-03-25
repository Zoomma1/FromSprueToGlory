import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [
        ReactiveFormsModule, RouterLink,
        MatIconModule, MatProgressSpinnerModule,
    ],
    templateUrl: './signup.component.html',
    styleUrl: './signup.component.scss',
})
export class SignupComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    form: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/)]],
        confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator.bind(this) });

    hidePassword = signal(true);
    loading = signal(false);
    error = signal('');

    constructor() {
        this.form.get('password')?.valueChanges.subscribe(() => {
            this.form.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
        });
    }

    private passwordsMatchValidator(form: FormGroup) {
        const password = form.get('password')?.value;
        const confirm = form.get('confirmPassword')?.value;

        if (!password || !confirm) {
            return null;
        }

        return password === confirm ? null : { passwordsMismatch: true };
    }

    loginWithGoogle(): void {
        window.location.href = `${environment.apiUrl}/auth/google`;
    }

    async onSubmit() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set('');

        try {
            await this.authService.signup(this.form.value.email, this.form.value.password);
            await this.router.navigate(['/dashboard']);
        } catch (err: unknown) {
            const error = err as { error?: { error?: string } };
            this.error.set(error?.error?.error || 'Signup failed');
            this.form.setErrors({ Conflict: true });
        } finally {
            this.loading.set(false);
        }
    }
}
