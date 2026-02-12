// ──────────────────────────────────────────────────────────
// 📁 Projects List Component — List all projects with progress
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { ProjectFormDialogComponent } from './project-form-dialog.component';

@Component({
    selector: 'app-projects-list',
    standalone: true,
    imports: [
        CommonModule, RouterLink,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule,
        MatSnackBarModule, MatDialogModule, MatTooltipModule,
    ],
    templateUrl: './projects-list.component.html',
    styleUrl: './projects-list.component.scss',
})
export class ProjectsListComponent implements OnInit {
    private api = inject(ApiService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    projects = signal<any[]>([]);

    ngOnInit() {
        this.loadProjects();
    }

    loadProjects() {
        this.api.getProjects().subscribe((p) => this.projects.set(p));
    }

    openCreateDialog() {
        const ref = this.dialog.open(ProjectFormDialogComponent, {
            width: '500px', maxWidth: '95vw',
            data: { mode: 'create' },
        });
        ref.afterClosed().subscribe((result) => { if (result) this.loadProjects(); });
    }

    openEditDialog(project: any, event: Event) {
        event.stopPropagation();
        const ref = this.dialog.open(ProjectFormDialogComponent, {
            width: '500px', maxWidth: '95vw',
            data: { mode: 'edit', project },
        });
        ref.afterClosed().subscribe((result) => { if (result) this.loadProjects(); });
    }

    deleteProject(project: any, event: Event) {
        event.stopPropagation();
        if (!confirm(`Delete project "${project.name}"?`)) return;
        this.api.deleteProject(project.id).subscribe(() => {
            this.snackBar.open('Project deleted', 'OK', { duration: 3000 });
            this.loadProjects();
        });
    }
}
