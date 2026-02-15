// ──────────────────────────────────────────────────────────
// 🎨 Color Schemes List Component
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { SchemeFormDialogComponent } from './scheme-form-dialog.component';
import { ColorScheme } from '../../classes/color-scheme';

@Component({
    selector: 'app-color-schemes-list',
    standalone: true,
    imports: [
        CommonModule, RouterLink,
        MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
        MatSnackBarModule, MatDialogModule, MatTooltipModule,
    ],
    templateUrl: './color-schemes-list.component.html',
    styleUrl: './color-schemes-list.component.scss',
})
export class ColorSchemesListComponent implements OnInit {
    private api = inject(ApiService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    schemes = signal<ColorScheme[]>([]);

    ngOnInit() {
        this.loadSchemes();
    }

    loadSchemes() {
        this.api.getColorSchemes().subscribe((s) => this.schemes.set(s));
    }

    openCreateDialog() {
        const ref = this.dialog.open(SchemeFormDialogComponent, {
            width: '700px', maxWidth: '95vw',
            data: { mode: 'create' },
        });
        ref.afterClosed().subscribe((result) => { if (result) this.loadSchemes(); });
    }

    openEditDialog(scheme: ColorScheme) {
        this.api.getColorScheme(scheme.id).subscribe((full) => {
            const ref = this.dialog.open(SchemeFormDialogComponent, {
                width: '700px', maxWidth: '95vw',
                data: { mode: 'edit', scheme: full },
            });
            ref.afterClosed().subscribe((result) => { if (result) this.loadSchemes(); });
        });
    }

    deleteScheme(scheme: ColorScheme) {
        if (!confirm(`Delete "${scheme.name}"?`)) return;
        this.api.deleteColorScheme(scheme.id).subscribe(() => {
            this.snackBar.open('Scheme deleted', 'OK', { duration: 3000 });
            this.loadSchemes();
        });
    }
}
