import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { Item, ItemStatusHistory } from '../../classes/items';
import { ColorScheme } from '../../classes/color-scheme';
import { Project } from '../../classes/project';
import { Technique } from '../../classes/technique';
import { GameSystem } from '../../classes/game-system';
import { Faction } from '../../classes/factions';
import { Model } from '../../classes/model';
import { PaintBrand } from '../../classes/paint-brand';
import { Paint } from '../../classes/paint';

describe('ApiService', () => {
    let service: ApiService;
    let httpMock: HttpTestingController;
    const baseUrl = environment.apiUrl;

    const mockGameSystems: GameSystem[] = [
        { id: 'gs-1', name: 'Warhammer 40k', slug: 'warhammer-40k', factionCount: 10 } as GameSystem,
        { id: 'gs-2', name: 'Age of Sigmar', slug: 'age-of-sigmar', factionCount: 8 } as GameSystem
    ];

    const mockFactions: Faction[] = [
        { id: 'f-1', name: 'Space Marines', gameSystemId: 'gs-1', gameSystem: { name: 'Warhammer 40k', slug: 'warhammer-40k' } } as Faction,
        { id: 'f-2', name: 'Orks', gameSystemId: 'gs-1', gameSystem: { name: 'Warhammer 40k', slug: 'warhammer-40k' } } as Faction
    ];

    const mockModels: Model[] = [
        { id: 'm-1', name: 'Terminator', factionId: 'f-1', pointsCost: 35, faction: mockFactions[0] } as Model,
        { id: 'm-2', name: 'Dreadnought', factionId: 'f-1', pointsCost: 350, faction: mockFactions[0] } as Model
    ];

    const mockPaintBrands: PaintBrand[] = [
        { id: 'pb-1', name: 'Citadel', slug: 'citadel', paintCount: 100 } as PaintBrand,
        { id: 'pb-2', name: 'Vallejo', slug: 'vallejo', paintCount: 100 } as PaintBrand,
    ];

    const mockPaints: Paint[] = [
        { id: 'p-1', name: 'Chaos Black', brandId: 'pb-1', code: 'ab-1', type: 'Base', notes: null, brand: mockPaintBrands[0] } as Paint,
        { id: 'p-2', name: 'Mephiston Red', brandId: 'pb-1', code: 'ab-2', type: 'Base', notes: null, brand: mockPaintBrands[0] } as Paint
    ];

    const mockTechniques: Technique[] = [
        { id: 't-1', name: 'Dry Brush', description: 'A technique for highlighting raised areas by lightly brushing paint over them.' } as Technique,
        { id: 't-2', name: 'Washing', description: 'A technique to add volume in the recesses' } as Technique
    ];

    const mockItemHistory: ItemStatusHistory[] = [
        { id: 'hist-1', itemId: 'item-1' , status: 'BOUGHT', changedAt: '2026-01-01T00:00:00Z', fromStatus: 'WANT', toStatus: 'BOUGHT'} as ItemStatusHistory,
        { id: 'hist-2', itemId: 'item-2', status: 'FINISHED', changedAt: '2026-02-01T00:00:00Z', fromStatus: 'WIP', toStatus: 'BOUGHT' } as ItemStatusHistory
    ];

    const mockItems: Item[] = [
        { id: 'item-1', name: 'Test Item 1' } as Item,
        { id: 'item-2', name: 'Test Item 2' } as Item
    ];

    const mockColorScheme: ColorScheme[] = [
        { id: 'cs-1', name: 'Scheme 1' } as ColorScheme,
        { id: 'cs-2', name: 'Scheme 2' } as ColorScheme
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                ApiService
            ]
        });
        service = TestBed.inject(ApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('Service initialization', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });
    });

    describe('Reference Data - getGameSystems', () => {
        it('should fetch game systems', (done) => {
            service.getGameSystems().subscribe(data => {
                expect(data).toEqual(mockGameSystems);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/game-systems`);
            expect(req.request.method).toBe('GET');
            req.flush(mockGameSystems);
        });

        it('should handle error when fetching game systems', (done) => {
            service.getGameSystems().subscribe({
                error: (error) => {
                    expect(error.status).toBe(500);
                    done();
                }
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/game-systems`);
            req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
        });
    });

    describe('Reference Data - getFactions', () => {
        it('should fetch factions without filter', (done) => {
            service.getFactions().subscribe(data => {
                expect(data).toEqual(mockFactions);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/factions`);
            expect(req.request.method).toBe('GET');
            req.flush(mockFactions);
        });

        it('should fetch factions with gameSystemId filter', (done) => {
            service.getFactions('gs-1').subscribe(data => {
                expect(data).toEqual(mockFactions);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/factions?gameSystemId=gs-1`);
            expect(req.request.params.get('gameSystemId')).toBe('gs-1');
            req.flush(mockFactions);
        });
    });

    describe('Reference Data - getModels', () => {
        it('should fetch models without filter', (done) => {
            service.getModels().subscribe(data => {
                expect(data).toEqual(mockModels);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/models`);
            req.flush(mockModels);
        });

        it('should fetch models with factionId filter', (done) => {
            const mockData = mockModels.filter((model) => model.factionId === 'f-1');

            service.getModels('f-1').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/models?factionId=f-1`);
            expect(req.request.params.get('factionId')).toBe('f-1');
            req.flush(mockData);
        });
    });

    describe('Reference Data - getPaintBrands', () => {
        it('should fetch paint brands', (done) => {
            service.getPaintBrands().subscribe(data => {
                expect(data).toEqual(mockPaintBrands);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/paint-brands`);
            expect(req.request.method).toBe('GET');
            req.flush(mockPaintBrands);
        });
    });

    describe('Reference Data - getPaints', () => {
        it('should fetch paints without filter', (done) => {
            service.getPaints().subscribe(data => {
                expect(data).toEqual(mockPaints);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/paints`);
            req.flush(mockPaints);
        });

        it('should fetch paints with brandId filter', (done) => {
            const mockData = mockPaints.filter((paint) => paint.brandId === 'pb-1');

            service.getPaints('pb-1').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/paints?brandId=pb-1`);
            expect(req.request.params.get('brandId')).toBe('pb-1');
            req.flush(mockData);
        });
    });

    describe('Reference Data - getTechniques', () => {
        it('should fetch techniques', (done) => {
            service.getTechniques().subscribe(data => {
                expect(data).toEqual(mockTechniques);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/reference/techniques`);
            expect(req.request.method).toBe('GET');
            req.flush(mockTechniques);
        });
    });

    describe('Items - CRUD operations', () => {
        it('should fetch items without filters', (done) => {
            service.getItems().subscribe(data => {
                expect(data).toEqual(mockItems);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items`);
            expect(req.request.method).toBe('GET');
            req.flush(mockItems);
        });

        it('should fetch items with filters', (done) => {
            const mockData = mockItems.filter(item => item.name === 'Test Item' && item.status === 'WANT');

            service.getItems({ name: 'Test Item', status: 'WANT' }).subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(request =>
                request.url === `${baseUrl}/items` &&
                request.params.get('name') === 'Test Item' &&
                request.params.get('status') === 'WANT'
            );
            req.flush(mockData);
        });

        it('should fetch a single item by id', (done) => {
            const mockData: Item = mockItems[0];

            service.getItem('item-1').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items/item-1`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });

        it('should not add query params when filters are empty', (done) => {
            service.getItems({}).subscribe(data => {
                expect(data).toEqual(mockItems);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items`);
            expect(req.request.params.keys().length).toBe(0);
            req.flush(mockItems);
        });

        it('should create a new item', (done) => {
            const payload = { name: 'New Item' };
            const mockResponse: Item = { id: 'item-1', ...payload } as Item;

            service.createItem(payload as never).subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(payload);
            req.flush(mockResponse);
        });

        it('should update an existing item', (done) => {
            const payload = { name: 'Updated Item' };
            const mockResponse: Item = { id: 'item-1', ...payload } as Item;

            service.updateItem('item-1', payload as never).subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items/item-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(payload);
            req.flush(mockResponse);
        });

        it('should delete an item', (done) => {
            service.deleteItem('item-1').subscribe(() => {
                expect(true).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items/item-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });

        it('should change item status', (done) => {
            const mockResponse: Item = { id: 'item-1', status: 'BOUGHT' } as Item;

            service.changeItemStatus('item-1', 'BOUGHT').subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items/item-1/status`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ status: 'BOUGHT' });
            req.flush(mockResponse);
        });

        it('should fetch item history', (done) => {
            service.getItemHistory('item-1').subscribe(data => {
                expect(data).toEqual(mockItemHistory);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/items/item-1/history`);
            expect(req.request.method).toBe('GET');
            req.flush(mockItemHistory);
        });
    });

    describe('Color Schemes - CRUD operations', () => {
        it('should fetch color schemes', (done) => {
            service.getColorSchemes().subscribe(data => {
                expect(data).toEqual(mockColorScheme);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/color-schemes`);
            expect(req.request.method).toBe('GET');
            req.flush(mockColorScheme);
        });

        it('should fetch a single color scheme by id', (done) => {
            const mockData: ColorScheme = mockColorScheme.filter((cs) => cs.id === 'cs-1')[0];

            service.getColorScheme('cs-1').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/color-schemes/cs-1`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });

        it('should create a new color scheme', (done) => {
            const payload = { name: 'New Scheme' };
            const mockResponse: ColorScheme = { id: 'cs-1', ...payload } as ColorScheme;

            service.createColorScheme(payload as never).subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/color-schemes`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(payload);
            req.flush(mockResponse);
        });

        it('should update an existing color scheme', (done) => {
            const payload = { name: 'Updated Scheme' };
            const mockResponse: ColorScheme = { id: 'cs-1', ...payload } as ColorScheme;

            service.updateColorScheme('cs-1', payload as never).subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/color-schemes/cs-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(payload);
            req.flush(mockResponse);
        });

        it('should delete a color scheme', (done) => {
            service.deleteColorScheme('cs-1').subscribe(() => {
                expect(true).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/color-schemes/cs-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });

    describe('Projects - CRUD operations', () => {
        it('should fetch projects', (done) => {
            const mockData: Project[] = [{ id: 'p-1', name: 'Project 1' } as Project];

            service.getProjects().subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });

        it('should fetch a single project by id', (done) => {
            const mockData: Project = { id: 'p-1', name: 'Project 1' } as Project;

            service.getProject('p-1').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects/p-1`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });

        it('should create a new project', (done) => {
            const payload: Project = { name: 'New Project', id: 'p-9999' } as Project;
            const mockResponse: Project = { ...payload } as Project;

            service.createProject(payload).subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(payload);
            req.flush(mockResponse);
        });

        it('should update an existing project', (done) => {
            const payload: Project = { name: 'Updated Project', id: 'p-9999'} as Project;
            const mockResponse: Project = {...payload } as Project;

            service.updateProject('p-1', payload).subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects/p-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(payload);
            req.flush(mockResponse);
        });

        it('should delete a project', (done) => {
            service.deleteProject('p-1').subscribe(() => {
                expect(true).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects/p-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });

        it('should assign items to a project', (done) => {
            const itemIds = ['item-1', 'item-2'];

            service.assignItemsToProject('p-1', itemIds).subscribe(() => {
                expect(true).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects/p-1/assign`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ itemIds });
            req.flush(null);
        });

        it('should unassign items from a project', (done) => {
            const itemIds = ['item-1', 'item-2'];

            service.unassignItemsFromProject('p-1', itemIds).subscribe(() => {
                expect(true).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/projects/p-1/unassign`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ itemIds });
            req.flush(null);
        });
    });

    describe('Media - Presigned URLs', () => {
        it('should get presigned upload URL', (done) => {
            const mockResponse = { uploadUrl: 'https://s3.example.com/upload', key: 'media-key-123' };

            service.getPresignUpload('photo.jpg', 'image/jpeg').subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/media/presign-upload`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ fileName: 'photo.jpg', fileType: 'image/jpeg' });
            req.flush(mockResponse);
        });

        it('should get presigned read URL', (done) => {
            const mockResponse = { readUrl: 'https://s3.example.com/read/media-key-123' };

            service.getPresignRead('media-key-123').subscribe(data => {
                expect(data).toEqual(mockResponse);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/media/presign-read/media-key-123`);
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });
    });

    describe('Export', () => {
        it('should export items as JSON', (done) => {
            const mockData: Item[] = [{ id: 'item-1', name: 'Item 1' } as Item];

            service.exportItems('json').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/export/items`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });

        it('should export items as CSV', (done) => {
            const mockData = 'id,name\nitem-1,Item 1';

            service.exportItems('csv').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/export/items?format=csv`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });

        it('should default to JSON export when no format specified', (done) => {
            const mockData: Item[] = [{ id: 'item-1', name: 'Item 1' } as Item];

            service.exportItems().subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/export/items`);
            req.flush(mockData);
        });

        it('should have correct content type for JSON export', (done) => {
            const mockData: Item[] = [{ id: 'item-1', name: 'Item 1' } as Item];

            service.exportItems('json').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/export/items`);
            expect(req.request.method).toBe('GET');
            expect(req.request.responseType).toBe('json');
            req.flush(mockData);
        });

          it('should have correct content type for CSV export', (done) => {
            const mockData = 'id,name\nitem-1,Item 1';

            service.exportItems('csv').subscribe(data => {
                expect(data).toEqual(mockData);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/export/items?format=csv`);
            expect(req.request.method).toBe('GET');
            expect(req.request.responseType).toBe('text');
            req.flush(mockData);
          });
    });

    describe('Account', () => {
        it('should delete account', (done) => {
            service.deleteAccount().subscribe(() => {
                expect(true).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}/account`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });

        it('should handle error when deleting account', (done) => {
            service.deleteAccount().subscribe({
                error: (error) => {
                    expect(error.status).toBe(401);
                    done();
                }
            });

            const req = httpMock.expectOne(`${baseUrl}/account`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        });
    });

    describe('Reference data caching', () => {
        it('should cache getGameSystems between calls', () => {
            service.getGameSystems().subscribe();
            httpMock.expectOne(`${baseUrl}/reference/game-systems`).flush(mockGameSystems);

            service.getGameSystems().subscribe(data => {
                expect(data).toEqual(mockGameSystems);
            });
            httpMock.expectNone(`${baseUrl}/reference/game-systems`);
        });

        it('should cache getFactions per gameSystemId', () => {
            service.getFactions('gs-1').subscribe();
            httpMock.expectOne(`${baseUrl}/reference/factions?gameSystemId=gs-1`).flush(mockFactions);

            service.getFactions('gs-1').subscribe(data => {
                expect(data).toEqual(mockFactions);
            });
            httpMock.expectNone(`${baseUrl}/reference/factions?gameSystemId=gs-1`);
        });

        it('should fetch factions separately for different gameSystemId', () => {
            let firstResult: Faction[] | undefined;
            let secondResult: Faction[] | undefined;

            service.getFactions('gs-1').subscribe(data => firstResult = data);
            httpMock.expectOne(`${baseUrl}/reference/factions?gameSystemId=gs-1`).flush(mockFactions);

            service.getFactions('gs-2').subscribe(data => secondResult = data);
            httpMock.expectOne(`${baseUrl}/reference/factions?gameSystemId=gs-2`).flush([]);

            expect(firstResult).toEqual(mockFactions);
            expect(secondResult).toEqual([]);
        });

        it('should cache getModels per factionId', () => {
            service.getModels('f-1').subscribe();
            httpMock.expectOne(`${baseUrl}/reference/models?factionId=f-1`).flush(mockModels);

            service.getModels('f-1').subscribe(data => {
                expect(data).toEqual(mockModels);
            });
            httpMock.expectNone(`${baseUrl}/reference/models?factionId=f-1`);
        });

        it('should fetch models separately for different factionId', () => {
            let firstResult: Model[] | undefined;
            let secondResult: Model[] | undefined;

            service.getModels('f-1').subscribe(data => firstResult = data);
            httpMock.expectOne(`${baseUrl}/reference/models?factionId=f-1`).flush(mockModels);

            service.getModels('f-2').subscribe(data => secondResult = data);
            httpMock.expectOne(`${baseUrl}/reference/models?factionId=f-2`).flush([]);

            expect(firstResult).toEqual(mockModels);
            expect(secondResult).toEqual([]);
        });
    });

    describe('User profile caching', () => {
        const mockProfile = {
            id: 'u-1',
            email: 'test@test.com',
            currency: 'EUR',
            hasGoogleLinked: false,
            hasPassword: true,
        };

        it('should cache getMe between calls', () => {
            service.getMe().subscribe();
            httpMock.expectOne(`${baseUrl}/users/me`).flush(mockProfile);

            service.getMe().subscribe(data => {
                expect(data).toEqual(mockProfile);
            });
            httpMock.expectNone(`${baseUrl}/users/me`);
        });

        it('should invalidate getMe cache after updateCurrency', () => {
            service.getMe().subscribe();
            httpMock.expectOne(req => req.url === `${baseUrl}/users/me` && req.method === 'GET')
                .flush(mockProfile);

            service.updateCurrency('USD').subscribe();
            httpMock.expectOne(req => req.url === `${baseUrl}/users/me` && req.method === 'PATCH')
                .flush({ id: 'u-1', email: 'test@test.com', currency: 'USD' });

            service.getMe().subscribe(data => {
                expect(data.currency).toBe('USD');
            });
            httpMock.expectOne(req => req.url === `${baseUrl}/users/me` && req.method === 'GET')
                .flush({ ...mockProfile, currency: 'USD' });
        });
    });
});
