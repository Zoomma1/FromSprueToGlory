// ──────────────────────────────────────────────────────────
// 🎨 Color Schemes List Component
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/services/api.service';
import { ColorScheme, ColorSchemeFull } from '../../../classes/color-scheme';

@Component({
    selector: 'app-color-schemes-list',
    standalone: true,
    imports: [
        CommonModule, RouterLink,
        MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
        MatSnackBarModule, MatTooltipModule,
    ],
    templateUrl: './color-schemes-list.component.html',
    styleUrl: './color-schemes-list.component.scss',
})
export class ColorSchemesListComponent implements OnInit {
    private api = inject(ApiService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    schemes = signal<ColorSchemeFull[]>([]);

    ngOnInit() {
        this.loadSchemes();
    }

    loadSchemes() {
        this.api.getColorSchemes().subscribe({
            next: (s) => this.schemes.set(s),
            error: () => {
                this.snackBar.open('Failed to load color schemes', 'OK', { duration: 3000 });
            },
        });
    }

    createScheme() {
        this.router.navigate(['/color-schemes', 'new']);
    }

    editScheme(scheme: ColorScheme) {
        this.router.navigate(['/color-schemes', 'edit', scheme.id]);
    }

    deleteScheme(scheme: ColorScheme) {
        if (!confirm(`Delete "${scheme.name}"?`)) return;
        this.api.deleteColorScheme(scheme.id).subscribe({
            next: () => {
                this.snackBar.open('Scheme deleted', 'OK', { duration: 3000 });
                this.loadSchemes();
            },
            error: () => {
                this.snackBar.open('Failed to delete scheme', 'OK', { duration: 3000 });
            },
        });
    }
}
