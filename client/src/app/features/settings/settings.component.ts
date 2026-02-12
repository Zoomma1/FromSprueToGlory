// ──────────────────────────────────────────────────────────
// ⚙️ Settings Component — Account, Export, Danger Zone
// ──────────────────────────────────────────────────────────
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent {
    authService = inject(AuthService);
    private api = inject(ApiService);
    private snackBar = inject(MatSnackBar);

    exportJSON() {
        this.api.exportItems('json').subscribe((data) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            this.download(blob, 'pile-of-shame.json');
        });
    }

    exportCSV() {
        this.api.exportItems('csv').subscribe((data) => {
            const blob = new Blob([data as string], { type: 'text/csv' });
            this.download(blob, 'pile-of-shame.csv');
        });
    }

    deleteAccount() {
        if (!confirm('This will permanently delete your account and ALL data. Are you sure?')) return;
        if (!confirm('This cannot be undone. Type are you REALLY sure?')) return;
        this.api.deleteAccount().subscribe(() => {
            this.snackBar.open('Account deleted', 'OK', { duration: 3000 });
            this.authService.logout();
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
