// ──────────────────────────────────────────────────────────
// 📣 Acquisition Channel Dialog — "How did you hear about us?"
// ──────────────────────────────────────────────────────────
// Shown once after first login when the user's acquisitionChannel is null.
// Self-report, closed list, skippable. Powers per-channel signup attribution
// (FSTG-14). Captured post-signup — works for both email/pw and OAuth users.
import { Component, inject, signal } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

interface ChannelOption {
    value: string;
    label: string;
}

@Component({
    selector: 'app-acquisition-channel-dialog',
    standalone: true,
    imports: [MatDialogModule, MatSnackBarModule],
    templateUrl: './acquisition-channel-dialog.component.html',
    styleUrl: './acquisition-channel-dialog.component.scss',
    host: { class: 'component-acquisition-channel-dialog' },
})
export class AcquisitionChannelDialogComponent {
    private api = inject(ApiService);
    private dialogRef = inject(MatDialogRef<AcquisitionChannelDialogComponent>);
    private snackBar = inject(MatSnackBar);

    readonly channels: ChannelOption[] = [
        { value: 'reddit', label: 'Reddit' },
        { value: 'discord', label: 'Discord' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'autre', label: 'Autre' },
    ];

    selected = signal<string | null>(null);
    saving = signal(false);

    select(value: string): void {
        this.selected.set(value);
    }

    submit(): void {
        const channel = this.selected();
        if (!channel || this.saving()) return;

        this.saving.set(true);
        this.api.setAcquisitionChannel(channel).subscribe({
            next: () => this.dialogRef.close('answered'),
            error: () => {
                this.saving.set(false);
                this.snackBar.open('Impossible d’enregistrer pour le moment.', 'OK', { duration: 4000 });
            },
        });
    }

    skip(): void {
        this.dialogRef.close('skipped');
    }
}
