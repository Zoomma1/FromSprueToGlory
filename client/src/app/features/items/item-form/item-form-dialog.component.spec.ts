import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemFormDialogComponent } from './item-form-dialog.component';
import { ApiService } from '../../../core/services/api.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('ItemFormDialogComponent', () => {
    let component: ItemFormDialogComponent;
    let fixture: ComponentFixture<ItemFormDialogComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', [
            'getGameSystems', 'getFactions', 'getModels', 'getProjects', 'createItem', 'updateItem'
        ]);

        apiSpy.getGameSystems.and.returnValue(of([]));
        apiSpy.getProjects.and.returnValue(of([]));
        apiSpy.getFactions.and.returnValue(of([]));
        apiSpy.getModels.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [ItemFormDialogComponent],
            providers: [
                { provide: ApiService, useValue: apiSpy },
                { provide: MAT_DIALOG_DATA, useValue: { mode: 'create' } },
                { provide: MatDialogRef, useValue: { close: close() } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemFormDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call getGameSystems and getProjects on init', () => {
        expect(apiSpy.getGameSystems).toHaveBeenCalledTimes(1);
        expect(apiSpy.getProjects).toHaveBeenCalledTimes(1);
    });

    it('should build the form with required fields on init', () => {
        expect(component.form).toBeTruthy();
        expect(component.form.get('name')).toBeTruthy();
        expect(component.form.get('gameSystem')).toBeTruthy();
        expect(component.form.get('faction')).toBeTruthy();
    });

    it('should be invalid when required fields are empty', () => {
        expect(component.form.valid).toBeFalse();
    });

    it('should be valid when required fields are filled', () => {
        component.form.patchValue({
            name: 'Space Marine',
            gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
            faction: { id: 'f-1', name: 'Space Marines' },
        });
        expect(component.form.valid).toBeTrue();
    });

    it('should load factions when onGameSystemChange is called', () => {
      const fakeFactions = [{ id: 'f-1', name: 'Space Marines', gameSystemId: 'gs-1', gameSystem: { name: 'Warhammer 40k', slug: 'Warhammer 40k' } }];
        apiSpy.getFactions.and.returnValue(of(fakeFactions));

        component.onGameSystemChange('gs-1');

        expect(apiSpy.getFactions).toHaveBeenCalledWith('gs-1');
        expect(component.factions()).toEqual(fakeFactions);
    });

    it('should reset faction and model when game system changes', () => {
        component.form.patchValue({ faction: { id: 'f-1', name: 'Old' }, model: { id: 'm-1', name: 'Old Model' } });

        component.onGameSystemChange('gs-2');

        expect(component.form.get('faction')?.value).toBeNull();
        expect(component.form.get('model')?.value).toBeNull();
    });
});
