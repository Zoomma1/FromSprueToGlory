import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AcquisitionChannelDialogComponent } from './acquisition-channel-dialog.component';
import { ApiService } from '../../../core/services/api.service';

describe('AcquisitionChannelDialogComponent', () => {
    let fixture: ComponentFixture<AcquisitionChannelDialogComponent>;
    let component: AcquisitionChannelDialogComponent;
    let el: HTMLElement;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AcquisitionChannelDialogComponent>>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', ['setAcquisitionChannel']);
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [AcquisitionChannelDialogComponent],
            providers: [
                { provide: ApiService, useValue: apiSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
            ],
        }).overrideComponent(AcquisitionChannelDialogComponent, {
            set: {
                providers: [
                    { provide: ApiService, useValue: apiSpy },
                    { provide: MatDialogRef, useValue: dialogRefSpy },
                    { provide: MatSnackBar, useValue: snackBarSpy },
                ],
            },
        }).compileComponents();

        fixture = TestBed.createComponent(AcquisitionChannelDialogComponent);
        component = fixture.componentInstance;
        el = fixture.nativeElement;
        fixture.detectChanges();
    });

    it('renders the four closed-list channels', () => {
        for (const value of ['reddit', 'discord', 'instagram', 'autre']) {
            expect(el.querySelector(`[data-testid="acq-option-${value}"]`)).toBeTruthy();
        }
    });

    it('disables Valider until a channel is selected', () => {
        const submit = el.querySelector<HTMLButtonElement>('[data-testid="acq-submit"]')!;
        expect(submit.disabled).toBeTrue();

        el.querySelector<HTMLButtonElement>('[data-testid="acq-option-reddit"]')!.click();
        fixture.detectChanges();

        expect(submit.disabled).toBeFalse();
        expect(component.selected()).toBe('reddit');
    });

    it('persists the channel and closes with "answered" on submit', () => {
        apiSpy.setAcquisitionChannel.and.returnValue(
            of({ id: 'u1', email: 'a@b.com', currency: 'EUR', acquisitionChannel: 'discord', hasGoogleLinked: false, hasPassword: true }),
        );

        el.querySelector<HTMLButtonElement>('[data-testid="acq-option-discord"]')!.click();
        fixture.detectChanges();
        el.querySelector<HTMLButtonElement>('[data-testid="acq-submit"]')!.click();

        expect(apiSpy.setAcquisitionChannel).toHaveBeenCalledWith('discord');
        expect(dialogRefSpy.close).toHaveBeenCalledWith('answered');
    });

    it('closes with "skipped" and never calls the API when skipping', () => {
        el.querySelector<HTMLButtonElement>('[data-testid="acq-skip"]')!.click();

        expect(dialogRefSpy.close).toHaveBeenCalledWith('skipped');
        expect(apiSpy.setAcquisitionChannel).not.toHaveBeenCalled();
    });

    it('shows a snackbar and stays open when the API fails', () => {
        apiSpy.setAcquisitionChannel.and.returnValue(throwError(() => new Error('boom')));

        component.select('reddit');
        component.submit();

        expect(snackBarSpy.open).toHaveBeenCalled();
        expect(dialogRefSpy.close).not.toHaveBeenCalled();
        expect(component.saving()).toBeFalse();
    });
});
