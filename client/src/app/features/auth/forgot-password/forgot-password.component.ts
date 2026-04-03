import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);

    form: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
    });

    loading = signal(false);
    submitted = signal(false);
    error = signal('');

    async onSubmit() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set('');

        try {
            await this.authService.forgotPassword(this.form.value.email);
            this.submitted.set(true);
        } catch {
            this.error.set('Something went wrong. Please try again.');
        } finally {
            this.loading.set(false);
        }
    }
}
