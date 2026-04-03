import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface LightboxData {
    url: string;
}

@Component({
    selector: 'app-scheme-image-lightbox',
    standalone: true,
    imports: [MatIconModule],
    template: `
        <div class="lightbox-wrap">
            <button class="lightbox-close" (click)="close()" type="button" aria-label="Close">
                <mat-icon>close</mat-icon>
            </button>
            <img [src]="data.url" class="lightbox-img" alt="">
        </div>
    `,
    styles: [`
        .lightbox-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 100vw;
            min-height: 100vh;
            cursor: pointer;
        }
        .lightbox-img {
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            cursor: default;
            display: block;
        }
        .lightbox-close {
            position: fixed;
            top: 1.25rem;
            right: 1.25rem;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            width: 2.5rem;
            height: 2.5rem;
            cursor: pointer;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            transition: background 0.2s ease;

            &:hover { background: rgba(0, 0, 0, 0.85); }
        }
    `],
})
export class SchemeImageLightboxComponent {
    data = inject<LightboxData>(MAT_DIALOG_DATA);
    private dialogRef = inject(MatDialogRef<SchemeImageLightboxComponent>);

    close(): void {
        this.dialogRef.close();
    }
}
