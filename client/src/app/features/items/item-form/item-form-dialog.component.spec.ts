import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemFormDialogComponent } from './item-form-dialog.component';
import { ApiService } from '../../../core/services/api.service';

describe('ItemFormDialogComponent', () => {
    let component: ItemFormDialogComponent;
    let fixture: ComponentFixture<ItemFormDialogComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;

    beforeEach(async () => {
        apiSpy = jasmine.createSpyObj('ApiService', ['getGameSystems', 'getFactions', 'getModels', 'getProjects', 'createItem', 'updateItem']);

        await TestBed.configureTestingModule({
            imports: [ItemFormDialogComponent],
            providers: [
                { provide: ApiService, useValue: apiSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemFormDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

})
