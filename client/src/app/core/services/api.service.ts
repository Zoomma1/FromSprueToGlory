// ──────────────────────────────────────────────────────────
// 📡 API Service — Centralized HTTP client for all API calls
// ──────────────────────────────────────────────────────────
// WHY a centralized API service?
//   - All API calls go through one place
//   - Easy to change base URL, add headers, or swap implementation
//   - Type-safe with generics
//   - ALTERNATIVE: call HttpClient directly in each component (scattered, hard to maintain)
// ──────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameSystem } from '../../classes/game-system';
import { Faction } from '../../classes/factions';
import { Model } from '../../classes/model';
import { PaintBrand } from '../../classes/paint-brand';
import { Paint } from '../../classes/paint';
import { Technique } from '../../classes/technique';
import { Item, ItemPayload, ItemStatusHistory } from '../../classes/items';
import { ColorScheme, ColorSchemePayload, ColorSchemeFull } from '../../classes/color-scheme';
import { Project } from '../../classes/project';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    // ─── Reference Data ────────────────────────
    getGameSystems(): Observable<GameSystem[]> {
        return this.http.get<GameSystem[]>(`${this.baseUrl}/reference/game-systems`);
    }

    getFactions(gameSystemId?: string): Observable<Faction[]> {
        let params = new HttpParams();
        if (gameSystemId) params = params.set('gameSystemId', gameSystemId);
        return this.http.get<Faction[]>(`${this.baseUrl}/reference/factions`, { params });
    }

    getModels(factionId?: string): Observable<Model[]> {
        let params = new HttpParams();
        if (factionId) params = params.set('factionId', factionId);
        return this.http.get<Model[]>(`${this.baseUrl}/reference/models`, { params });
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

    // ─── Items ─────────────────────────────────
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

    // ─── Color Schemes ─────────────────────────
    getColorSchemes(): Observable<ColorScheme[]> {
        return this.http.get<ColorScheme[]>(`${this.baseUrl}/color-schemes`);
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

    // ─── Projects ─────────────────────────────
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

    // ─── Media ─────────────────────────────────
    getPresignUpload(fileName: string, contentType: string): Observable<{ uploadUrl: string; key: string }> {
        return this.http.post<{ uploadUrl: string; key: string }>(
            `${this.baseUrl}/media/presign-upload`,
            { fileName, contentType },
        );
    }

    getPresignRead(key: string): Observable<{ readUrl: string }> {
        return this.http.get<{ readUrl: string }>(`${this.baseUrl}/media/presign-read/${key}`);
    }

    // ─── Export ────────────────────────────────
    exportItems(format: 'json' | 'csv' = 'json'): Observable<Item[] | string> {
        if (format === 'csv') {
            return this.http.get(`${this.baseUrl}/export/items?format=csv`, { responseType: 'text' });
        }
        return this.http.get<Item[]>(`${this.baseUrl}/export/items`);
    }

    // ─── Account ───────────────────────────────
    deleteAccount(): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/account`);
    }
}
