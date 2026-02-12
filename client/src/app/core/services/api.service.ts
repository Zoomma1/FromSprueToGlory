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

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    // ─── Reference Data ────────────────────────
    getGameSystems(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/reference/game-systems`);
    }

    getFactions(gameSystemId?: string): Observable<any[]> {
        let params = new HttpParams();
        if (gameSystemId) params = params.set('gameSystemId', gameSystemId);
        return this.http.get<any[]>(`${this.baseUrl}/reference/factions`, { params });
    }

    getModels(factionId?: string): Observable<any[]> {
        let params = new HttpParams();
        if (factionId) params = params.set('factionId', factionId);
        return this.http.get<any[]>(`${this.baseUrl}/reference/models`, { params });
    }

    getPaintBrands(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/reference/paint-brands`);
    }

    getPaints(brandId?: string): Observable<any[]> {
        let params = new HttpParams();
        if (brandId) params = params.set('brandId', brandId);
        return this.http.get<any[]>(`${this.baseUrl}/reference/paints`, { params });
    }

    getTechniques(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/reference/techniques`);
    }

    // ─── Items ─────────────────────────────────
    getItems(filters?: Record<string, string>): Observable<any[]> {
        let params = new HttpParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params = params.set(key, value);
            });
        }
        return this.http.get<any[]>(`${this.baseUrl}/items`, { params });
    }

    getItem(id: string): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/items/${id}`);
    }

    createItem(data: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/items`, data);
    }

    updateItem(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/items/${id}`, data);
    }

    deleteItem(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/items/${id}`);
    }

    changeItemStatus(id: string, status: string): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/items/${id}/status`, { status });
    }

    getItemHistory(id: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/items/${id}/history`);
    }

    // ─── Color Schemes ─────────────────────────
    getColorSchemes(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/color-schemes`);
    }

    getColorScheme(id: string): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/color-schemes/${id}`);
    }

    createColorScheme(data: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/color-schemes`, data);
    }

    updateColorScheme(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/color-schemes/${id}`, data);
    }

    deleteColorScheme(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/color-schemes/${id}`);
    }

    // ─── Projects ─────────────────────────────
    getProjects(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/projects`);
    }

    getProject(id: string): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/projects/${id}`);
    }

    createProject(data: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/projects`, data);
    }

    updateProject(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/projects/${id}`, data);
    }

    deleteProject(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
    }

    assignItemsToProject(projectId: string, itemIds: string[]): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/assign`, { itemIds });
    }

    unassignItemsFromProject(projectId: string, itemIds: string[]): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/unassign`, { itemIds });
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
    exportItems(format: 'json' | 'csv' = 'json'): Observable<any> {
        if (format === 'csv') {
            return this.http.get(`${this.baseUrl}/export/items?format=csv`, { responseType: 'text' as any });
        }
        return this.http.get<any>(`${this.baseUrl}/export/items`);
    }

    // ─── Account ───────────────────────────────
    deleteAccount(): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/account`);
    }
}
