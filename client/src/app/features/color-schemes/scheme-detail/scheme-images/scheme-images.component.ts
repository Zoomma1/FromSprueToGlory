import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ColorSchemeImage } from '../../../../classes/color-scheme';
import { SchemeImageLightboxComponent } from '../scheme-image-lightbox/scheme-image-lightbox.component';

@Component({
    selector: 'app-scheme-images',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './scheme-images.component.html',
    styleUrl: './scheme-images.component.scss',
})
export class SchemeImagesComponent implements OnChanges {
    @Input() schemeId!: string;
    @Input() images: ColorSchemeImage[] = [];
    @Output() imagesChanged = new EventEmitter<void>();

    private api = inject(ApiService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    readUrls = signal<string[]>([]);
    uploading = signal(false);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['images']) {
            this.resolveUrls();
        }
    }

    private resolveUrls(): void {
        if (!this.images.length) {
            this.readUrls.set([]);
            return;
        }
        forkJoin(this.images.map(img => this.api.getPresignRead(img.key))).subscribe({
            next: (results) => this.readUrls.set(results.map(r => r.readUrl)),
            error: () => this.readUrls.set(this.images.map(() => '')),
        });
    }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        (event.target as HTMLInputElement).value = '';

        this.uploading.set(true);
        const nextOrder = this.images.length;

        this.api.getPresignUpload(file.name, file.type).subscribe({
            next: ({ uploadUrl, key }) => {
                this.api.uploadToS3(uploadUrl, file).subscribe({
                    next: () => {
                        this.api.addSchemeImage(this.schemeId, key, nextOrder).subscribe({
                            next: () => {
                                this.uploading.set(false);
                                this.imagesChanged.emit();
                            },
                            error: (err) => {
                                this.uploading.set(false);
                                this.snackBar.open(err?.error?.error || 'Failed to save image', 'OK', { duration: 5000 });
                            },
                        });
                    },
                    error: () => {
                        this.uploading.set(false);
                        this.snackBar.open('Upload failed', 'OK', { duration: 5000 });
                    },
                });
            },
            error: () => {
                this.uploading.set(false);
                this.snackBar.open('Failed to get upload URL', 'OK', { duration: 5000 });
            },
        });
    }

    removeImage(image: ColorSchemeImage): void {
        if (!confirm('Remove this photo?')) return;
        this.api.removeSchemeImage(this.schemeId, image.id).subscribe({
            next: () => this.imagesChanged.emit(),
            error: (err) => {
                this.snackBar.open(err?.error?.error || 'Failed to remove image', 'OK', { duration: 5000 });
            },
        });
    }

    openLightbox(url: string): void {
        this.dialog.open(SchemeImageLightboxComponent, {
            data: { url },
            panelClass: 'lightbox-panel',
            maxWidth: '100vw',
            maxHeight: '100vh',
        });
    }
}
