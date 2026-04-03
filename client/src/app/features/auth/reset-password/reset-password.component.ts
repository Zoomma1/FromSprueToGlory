import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    private token = '';

    form: FormGroup = this.fb.group({
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
    });

    hidePassword = signal(true);
    loading = signal(false);
    done = signal(false);
    error = signal('');
    invalidToken = signal(false);

    ngOnInit() {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.invalidToken.set(true);
            return;
        }
        this.token = token;
    }

    async onSubmit() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set('');

        try {
            await this.authService.resetPassword(this.token, this.form.value.newPassword);
            this.done.set(true);
            setTimeout(() => this.router.navigate(['/auth/login']), 3000);
        } catch (err: unknown) {
            const error = err as { error?: { error?: string } };
            this.error.set(error?.error?.error || 'Invalid or expired reset link.');
        } finally {
            this.loading.set(false);
        }
    }
}
