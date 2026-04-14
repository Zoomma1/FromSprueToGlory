import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { SKIP_AUTH } from '../interceptors/jwt.interceptor';
import { environment } from '../../../environments/environment';
import { GameSystem } from '../../classes/game-system';
import { Faction } from '../../classes/factions';
import { Model } from '../../classes/model';
import { PaintBrand } from '../../classes/paint-brand';
import { Paint, SimilarPaint, PaintWithEquivalents, PaintCollectionResult, PaintFilter } from '../../classes/paint';
import { Technique } from '../../classes/technique';
import { Item, ItemPayload, ItemStatusHistory } from '../../classes/items';
import { ColorScheme, ColorSchemePayload, ColorSchemeFull, ColorSchemeImage } from '../../classes/color-scheme';
import { UserCustomPaint, UserCustomPaintPayload } from '../../classes/user-custom-paint';
import { Project } from '../../classes/project';

interface UserProfile {
    id: string;
    email: string;
    currency: string;
    hasGoogleLinked: boolean;
    hasPassword: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    // Caches for static reference data + session-stable user profile.
    // Reason: item-form dialog opens fire 3-5 reference requests each —
    // a 20-item army saisie burst would otherwise exceed rate limits.
    private _gameSystems$?: Observable<GameSystem[]>;
    private _factions$ = new Map<string, Observable<Faction[]>>();
    private _models$ = new Map<string, Observable<Model[]>>();
    private _me$?: Observable<UserProfile>;

    //  Reference Data
    getGameSystems(): Observable<GameSystem[]> {
        this._gameSystems$ ??= this.http
            .get<GameSystem[]>(`${this.baseUrl}/reference/game-systems`)
            .pipe(shareReplay(1));
        return this._gameSystems$;
    }

    getFactions(gameSystemId?: string): Observable<Faction[]> {
        const key = gameSystemId ?? '';
        let cached = this._factions$.get(key);
        if (!cached) {
            let params = new HttpParams();
            if (gameSystemId) params = params.set('gameSystemId', gameSystemId);
            cached = this.http
                .get<Faction[]>(`${this.baseUrl}/reference/factions`, { params })
                .pipe(shareReplay(1));
            this._factions$.set(key, cached);
        }
        return cached;
    }

    getModels(factionId?: string): Observable<Model[]> {
        const key = factionId ?? '';
        let cached = this._models$.get(key);
        if (!cached) {
            let params = new HttpParams();
            if (factionId) params = params.set('factionId', factionId);
            cached = this.http
                .get<Model[]>(`${this.baseUrl}/reference/models`, { params })
                .pipe(shareReplay(1));
            this._models$.set(key, cached);
        }
        return cached;
    }

    getPaintBrands(): Observable<PaintBrand[]> {
        return this.http.get<PaintBrand[]>(`${this.baseUrl}/reference/paint-brands`);
    }

    getPaints(brandId?: string): Observable<Paint[]> {
        let params = new HttpParams();
        if (brandId) params = params.set('brandId', brandId);
        return this.http.get<Paint[]>(`${this.baseUrl}/reference/paints`, { params });
    }

    getTechniques(): Observable<Technique[]> {
        return this.http.get<Technique[]>(`${this.baseUrl}/reference/techniques`);
    }

    getSimilarPaints(paintId: string): Observable<SimilarPaint[]> {
        return this.http.get<SimilarPaint[]>(`${this.baseUrl}/reference/paints/${paintId}/similar`);
    }

    getAllSimilarPaints(): Observable<PaintWithEquivalents[]> {
        return this.http.get<PaintWithEquivalents[]>(`${this.baseUrl}/reference/similar-paints`);
    }

    //  Items
    getItems(filters?: Record<string, string>): Observable<Item[]> {
        let params = new HttpParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params = params.set(key, value);
            });
        }
        return this.http.get<Item[]>(`${this.baseUrl}/items`, { params });
    }

    getItem(id: string): Observable<Item> {
        return this.http.get<Item>(`${this.baseUrl}/items/${id}`);
    }

    createItem(data: ItemPayload): Observable<Item> {
        return this.http.post<Item>(`${this.baseUrl}/items`, data);
    }

    updateItem(id: string, data: ItemPayload): Observable<Item> {
        return this.http.put<Item>(`${this.baseUrl}/items/${id}`, data);
    }

    deleteItem(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/items/${id}`);
    }

    changeItemStatus(id: string, status: string): Observable<Item> {
        return this.http.patch<Item>(`${this.baseUrl}/items/${id}/status`, { status });
    }

    getItemHistory(id: string): Observable<ItemStatusHistory[]> {
        return this.http.get<ItemStatusHistory[]>(`${this.baseUrl}/items/${id}/history`);
    }

    //  Paint Collection (owned / wishlist)
    getPaintCollection(filter?: PaintFilter): Observable<PaintCollectionResult> {
        let params = new HttpParams();
        if (filter) params = params.set('filter', filter);
        return this.http.get<PaintCollectionResult>(`${this.baseUrl}/paints`, { params });
    }

    markPaintAsOwned(paintId: string): Observable<{ paintId: string }> {
        return this.http.post<{ paintId: string }>(`${this.baseUrl}/paints/owned/${paintId}`, {});
    }

    removePaintFromOwned(paintId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/paints/owned/${paintId}`);
    }

    addPaintToWishlist(paintId: string): Observable<{ paintId: string }> {
        return this.http.post<{ paintId: string }>(`${this.baseUrl}/paints/wishlist/${paintId}`, {});
    }

    removePaintFromWishlist(paintId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/paints/wishlist/${paintId}`);
    }

    //  User Custom Paints
    getUserCustomPaints(): Observable<UserCustomPaint[]> {
        return this.http.get<UserCustomPaint[]>(`${this.baseUrl}/user-paints`);
    }

    createUserCustomPaint(data: UserCustomPaintPayload): Observable<UserCustomPaint> {
        return this.http.post<UserCustomPaint>(`${this.baseUrl}/user-paints`, data);
    }

    deleteUserCustomPaint(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/user-paints/${id}`);
    }

    //  Color Schemes
    getColorSchemes(): Observable<ColorSchemeFull[]> {
        return this.http.get<ColorSchemeFull[]>(`${this.baseUrl}/color-schemes`);
    }

    getColorScheme(id: string): Observable<ColorSchemeFull> {
        return this.http.get<ColorSchemeFull>(`${this.baseUrl}/color-schemes/${id}`);
    }

    createColorScheme(data: ColorSchemePayload): Observable<ColorScheme> {
        return this.http.post<ColorScheme>(`${this.baseUrl}/color-schemes`, data);
    }

    updateColorScheme(id: string, data: ColorSchemePayload): Observable<ColorScheme> {
        return this.http.put<ColorScheme>(`${this.baseUrl}/color-schemes/${id}`, data);
    }

    deleteColorScheme(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/color-schemes/${id}`);
    }

    addSchemeImage(schemeId: string, key: string, order: number): Observable<ColorSchemeImage> {
        return this.http.post<ColorSchemeImage>(
            `${this.baseUrl}/color-schemes/${schemeId}/images`,
            { key, order },
        );
    }

    removeSchemeImage(schemeId: string, imageId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/color-schemes/${schemeId}/images/${imageId}`);
    }

    uploadToS3(uploadUrl: string, file: File): Observable<unknown> {
        return this.http.put(uploadUrl, file, {
            headers: { 'Content-Type': file.type },
            context: new HttpContext().set(SKIP_AUTH, true),
        });
    }

    //  Projects
    getProjects(): Observable<Project[]> {
        return this.http.get<Project[]>(`${this.baseUrl}/projects`);
    }

    getProject(id: string): Observable<Project> {
        return this.http.get<Project>(`${this.baseUrl}/projects/${id}`);
    }

    createProject(data: Project): Observable<Project> {
        return this.http.post<Project>(`${this.baseUrl}/projects`, data);
    }

    updateProject(id: string, data: Project): Observable<Project> {
        return this.http.put<Project>(`${this.baseUrl}/projects/${id}`, data);
    }

    deleteProject(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
    }

    assignItemsToProject(projectId: string, itemIds: string[]): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/projects/${projectId}/assign`, { itemIds });
    }

    unassignItemsFromProject(projectId: string, itemIds: string[]): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/projects/${projectId}/unassign`, { itemIds });
    }

    //  Media
    getPresignUpload(fileName: string, fileType: string): Observable<{ uploadUrl: string; key: string }> {
        return this.http.post<{ uploadUrl: string; key: string }>(
            `${this.baseUrl}/media/presign-upload`,
            { fileName, fileType },
        );
    }

    getPresignRead(key: string): Observable<{ readUrl: string }> {
        return this.http.get<{ readUrl: string }>(`${this.baseUrl}/media/presign-read/${key}`);
    }

    //  Export
    exportItems(format: 'json' | 'csv' = 'json'): Observable<Item[] | string> {
        if (format === 'csv') {
            return this.http.get(`${this.baseUrl}/export/items?format=csv`, { responseType: 'text' });
        }
        return this.http.get<Item[]>(`${this.baseUrl}/export/items`);
    }

    //  User Profile
    getMe(): Observable<UserProfile> {
        this._me$ ??= this.http
            .get<UserProfile>(`${this.baseUrl}/users/me`)
            .pipe(shareReplay(1));
        return this._me$;
    }

    linkGoogle(): Observable<{ redirectUrl: string }> {
        return this.http.post<{ redirectUrl: string }>(`${this.baseUrl}/users/me/google-link`, {  });
    }

    updateCurrency(currency: string): Observable<{ id: string; email: string; currency: string }> {
        this._me$ = undefined;
        return this.http.patch<{ id: string; email: string; currency: string }>(
            `${this.baseUrl}/users/me`,
            { currency },
        );
    }

    //  Account
    deleteAccount(): Observable<void> {
        this._me$ = undefined;
        return this.http.delete<void>(`${this.baseUrl}/account`);
    }
}
