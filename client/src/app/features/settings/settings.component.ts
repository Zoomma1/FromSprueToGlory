// ──────────────────────────────────────────────────────────
// ⚙️ Settings Component — Account, Export, Danger Zone
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { CURRENCIES } from '../../classes/item.constants';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        FormsModule,
        MatIconModule, MatSnackBarModule,
    ],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
    authService = inject(AuthService);
    private api = inject(ApiService);
    private snackBar = inject(MatSnackBar);

    readonly CURRENCIES = CURRENCIES;
    selectedCurrency = signal('EUR');
    savingCurrency = signal(false);

    ngOnInit() {
        this.api.getMe().subscribe({
            next: (profile) => this.selectedCurrency.set(profile.currency),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            error: () => {},
        });
    }

    saveCurrency() {
        this.savingCurrency.set(true);
        this.api.updateCurrency(this.selectedCurrency()).subscribe({
            next: () => {
                this.snackBar.open('Currency saved', 'OK', { duration: 3000 });
                this.savingCurrency.set(false);
            },
            error: () => {
                this.snackBar.open('Failed to save currency', 'OK', { duration: 3000 });
                this.savingCurrency.set(false);
            },
        });
    }

    exportJSON() {
        this.api.exportItems('json').subscribe({
            next: (data) => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                this.download(blob, 'pile-of-shame.json');
            },
            error: () => {
                this.snackBar.open('Failed to export JSON', 'OK', { duration: 3000 });
            },
        });
    }

    exportCSV() {
        this.api.exportItems('csv').subscribe({
            next: (data) => {
                const blob = new Blob([data as string], { type: 'text/csv' });
                this.download(blob, 'pile-of-shame.csv');
            },
            error: () => {
                this.snackBar.open('Failed to export CSV', 'OK', { duration: 3000 });
            },
        });
    }

    deleteAccount() {
        if (!confirm('This will permanently delete your account and ALL data. Are you sure?')) return;
        if (!confirm('This cannot be undone. Type are you REALLY sure?')) return;
        this.api.deleteAccount().subscribe({
            next: () => {
                this.snackBar.open('Account deleted', 'OK', { duration: 3000 });
                this.authService.logout();
            },
            error: () => {
                this.snackBar.open('Failed to delete account', 'OK', { duration: 3000 });
            },
        });
    }

    private download(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open(`Downloaded ${filename}`, 'OK', { duration: 3000 });
    }
}
