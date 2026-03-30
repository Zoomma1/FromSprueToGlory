import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemFormDialogComponent } from './item-form-dialog.component';
import { ApiService } from '../../../core/services/api.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Item } from '../../../classes/items';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('ItemFormDialogComponent', () => {
    let component: ItemFormDialogComponent;
    let fixture: ComponentFixture<ItemFormDialogComponent>;
    let apiSpy: jasmine.SpyObj<ApiService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ItemFormDialogComponent>>;

    const mockItem: Item[] = [
        {
            id: 'item-1',
            name: 'Test Item',
            gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
            tags: ['Test Item', 'Test Tag'],
        } as Item,
        {
          id: 'item-2',
          name: 'Test Item 2',
          gameSystem: { id: 'gs-2', name: 'Warhammer Fantasy' } } as Item,
    ];

    async function createComponent(
        dialogData: Record<string, unknown> = { mode: 'create' },
        spySetup?: (api: jasmine.SpyObj<ApiService>) => void,
    ) {
        apiSpy = jasmine.createSpyObj('ApiService', [
            'getGameSystems', 'getFactions', 'getProjects', 'createItem', 'updateItem', 'getMe'
        ]);
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        apiSpy.getGameSystems.and.returnValue(of([]));
        apiSpy.getProjects.and.returnValue(of([]));
        apiSpy.getFactions.and.returnValue(of([]));
        apiSpy.getMe.and.returnValue(of({ id: 'u1', email: 'test@test.com', currency: 'EUR', hasGoogleLinked: false }));

        if (spySetup) spySetup(apiSpy);

        await TestBed.resetTestingModule().configureTestingModule({
            imports: [ItemFormDialogComponent],
        }).overrideComponent(ItemFormDialogComponent, {
            set: {
                providers: [
                    { provide: ApiService, useValue: apiSpy },
                    { provide: MAT_DIALOG_DATA, useValue: dialogData },
                    { provide: MatDialogRef, useValue: dialogRefSpy },
                    { provide: MatSnackBar, useValue: snackBarSpy },
                ],
            }
        }).compileComponents();

        fixture = TestBed.createComponent(ItemFormDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(async () => {
        await createComponent();
    });

    describe('Component initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should call getGameSystems and getProjects on init', () => {
            expect(apiSpy.getGameSystems).toHaveBeenCalledTimes(1);
            expect(apiSpy.getProjects).toHaveBeenCalledTimes(1);
        });

        it('should set project if defaultProjectId is provided in create mode', async () => {
            const fakeProjects = [{ id: 'proj-1', userId: 'u-1', name: 'Project 1', description: 'Desc', createdAt: new Date().toDateString(), updatedAt: new Date().toDateString() }];
            await createComponent(
                { mode: 'create', defaultProjectId: 'proj-1' },
                (api) => api.getProjects.and.returnValue(of(fakeProjects)),
             );

            expect(component.form.get('project')?.value).toEqual(jasmine.objectContaining({ id: 'proj-1', name: 'Project 1' }));
        })
    });

    describe('Form initialization', () => {
        it('should build the form with required fields on init', () => {
            expect(component.form).toBeTruthy();
            expect(component.form.get('name')).toBeTruthy();
            expect(component.form.get('gameSystem')).toBeTruthy();
            expect(component.form.get('faction')).toBeTruthy();
        });
    });

    describe('Form edit mode', () => {
        it('should initialize form with item data when in edit mode', async () => {
            await createComponent(
                { mode: 'edit', item: { ...mockItem[0], gameSystemId: 'gs-1' } },
                (api) => api.getGameSystems.and.returnValue(of([{ id: 'gs-1', name: 'Warhammer 40k', slug: 'warhammer-40k', factionCount: 0 }])),
            );

            expect(component.form.get('name')?.value).toEqual('Test Item');
            expect(component.form.get('gameSystem')?.value).toEqual(jasmine.objectContaining({ id: 'gs-1', name: 'Warhammer 40k' }));
        });

        it('should handle missing game system gracefully in edit mode', async () => {
            await createComponent({ mode: 'edit', item: { ...mockItem[0], gameSystemId: 'non-existent' } });

            expect(component.form.get('gameSystem')?.value).toBeNull();
        });

        it('should handle missing project gracefully in edit mode', async () => {
            await createComponent({ mode: 'edit', item: { ...mockItem[0], projectId: 'non-existent' } });

            expect(component.form.get('project')?.value).toBeNull();
        });

        it('should cascade load factions when initializing in edit mode', async () => {
            const fakeGameSystems = [{ id: 'gs-1', name: 'Warhammer 40k', slug: 'warhammer-40k', factionCount: 0 }];
            const fakeFactions = [{ id: 'f-1', name: 'Space Marines', gameSystemId: 'gs-1', gameSystem: { name: 'Warhammer 40k', slug: 'Warhammer 40k' } }];

            await createComponent(
                { mode: 'edit', item: { ...mockItem[0], gameSystemId: 'gs-1', factionId: 'f-1' } },
                (api) => {
                    api.getGameSystems.and.returnValue(of(fakeGameSystems));
                    api.getFactions.and.returnValue(of(fakeFactions));
                },
            );

            expect(apiSpy.getFactions).toHaveBeenCalledWith('gs-1');
            expect(component.form.get('faction')?.value).toEqual(jasmine.objectContaining({ id: 'f-1', name: 'Space Marines' }));
        });
    });

    describe('Form validation', () => {
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
    });

    describe('Game System changes', () => {
        it('should load factions when onGameSystemChange is called', () => {
            const fakeFactions = [{ id: 'f-1', name: 'Space Marines', gameSystemId: 'gs-1', gameSystem: { name: 'Warhammer 40k', slug: 'Warhammer 40k' } }];
            apiSpy.getFactions.and.returnValue(of(fakeFactions));

            component.onGameSystemChange('gs-1');

            expect(apiSpy.getFactions).toHaveBeenCalledWith('gs-1');
            expect(component.factions()).toEqual(fakeFactions);
        });

        it('should reset faction when game system changes', () => {
            component.form.patchValue({ faction: { id: 'f-1', name: 'Old' }});

            component.onGameSystemChange('gs-2');

            expect(component.form.get('faction')?.value).toBeNull();
        });
    });

  describe('Save', () => {
        it('should call createItem on save when in create mode', () => {
            component.form.patchValue({
                name: 'New Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });
            apiSpy.createItem.and.returnValue(of({} as Item));

            component.save();

            expect(apiSpy.createItem).toHaveBeenCalled();
         });

        it('should call updateItem on save when in edit mode', async () => {
            await createComponent({
                mode: 'edit',
                item: { ...mockItem[0], id: 'item-1', status: 'WANT', quantity: 1 },
            });

            component.form.patchValue({
                name: 'Updated Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });
            apiSpy.updateItem.and.returnValue(of({} as Item));

            component.save();

            expect(apiSpy.updateItem).toHaveBeenCalledWith('item-1', jasmine.objectContaining({
                name: 'Updated Item',
                gameSystemId: 'gs-1',
                factionId: 'f-1',
            }));
          });

        it('should display snackbar and close dialog on successful save', () => {
            component.form.patchValue({
                name: 'New Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });
            apiSpy.createItem.and.returnValue(of({} as Item));

            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Item created!', 'OK', { duration: 3000 });
            expect(dialogRefSpy.close).toHaveBeenCalled();
        });

        it('should display snackbar with correct message on edit mode', async () => {
            await createComponent({
                mode: 'edit',
                item: { ...mockItem[0], id: 'item-1', status: 'WANT', quantity: 1 },
             });

            component.form.patchValue({
                name: 'Updated Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });
            apiSpy.updateItem.and.returnValue(of({} as Item));

            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Item updated!', 'OK', { duration: 3000 });
        });

        it('should display snackbar with error message on save failure', () => {
            component.form.patchValue({
                name: 'New Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });

            apiSpy.createItem.and.returnValue(throwError(() => ({ error: { error: 'Save failed' } })));

            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Save failed', 'OK', { duration: 5000 });
        });

        it('should display generic error when save fails without specific message', () => {
            component.form.patchValue({
                name: 'New Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });

            apiSpy.createItem.and.returnValue(throwError(() => ({})));

            component.save();

            expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save', 'OK', { duration: 5000 });
        });

        it('should set saving to true during save', () => {
            component.form.patchValue({
                name: 'New Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });
            apiSpy.createItem.and.returnValue(of({} as Item));

            component.save();

            expect(component.saving()).toBeTrue();
        });

        it('should set saving to false on save failure', () => {
            component.form.patchValue({
                name: 'New Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
            });

            apiSpy.createItem.and.returnValue(throwError(() => ({ error: { error: 'Save failed' } })));

            component.save();

            expect(component.saving()).toBeFalse();
        });

        it('should not call API if form is invalid', () => {
            component.form.patchValue({
                name: '',
                gameSystem: null,
                faction: null,
            });

            component.save();

            expect(apiSpy.createItem).not.toHaveBeenCalled();
            expect(apiSpy.updateItem).not.toHaveBeenCalled();
        });
  });

    describe('Tags management', () => {
        it('should initialize tags as empty array in create mode', async () => {
            await createComponent({ mode: 'create' });

            expect(component.tags()).toEqual([]);
        });

        it('should initialize tags with item tags in edit mode', async () => {
            await createComponent({
                mode: 'edit',
                item: { ...mockItem[0], id: 'item-1', status: 'WANT', quantity: 1 },
          });

          expect(component.tags()).toEqual(mockItem[0].tags);
        });

        it('should add a tag when addTag is called with a value', () => {
            component.addTag('New Tag');

            expect(component.tags()).toContain('New Tag');
        });

        it('should not add empty or whitespace-only tags', () => {
            component.addTag('   ');

            expect(component.tags()).not.toContain('   ');
        });

        it('should remove a tag when removeTag is called', () => {
            component.form.patchValue({ tags: ['Tag1', 'Tag2'] });

            component.removeTag('Tag1');

            expect(component.tags()).not.toContain('Tag1');
            expect(component.tags()).toContain('Tag2');
         });

        it('should include tags in payload on save', async () => {
            await createComponent({
                mode: 'edit',
                item: { ...mockItem[0], id: 'item-1', status: 'WANT', quantity: 1 },
            });

            component.form.patchValue({
                name: 'Updated Item',
                gameSystem: { id: 'gs-1', name: 'Warhammer 40k' },
                faction: { id: 'f-1', name: 'Space Marines' },
                tags: ['Tag1', 'Tag2'],
            });
            apiSpy.updateItem.and.returnValue(of({} as Item));

            component.save();

            expect(apiSpy.updateItem).toHaveBeenCalledWith('item-1', jasmine.objectContaining({
                tags: ['Tag1', 'Tag2'],
            }));
        });
    });
});
