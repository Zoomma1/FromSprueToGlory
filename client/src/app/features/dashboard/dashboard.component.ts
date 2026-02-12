// ──────────────────────────────────────────────────────────
// 📊 Dashboard Component — Stats + Overview
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface StatusCount {
    status: string;
    count: number;
    icon: string;
    color: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
    private api = inject(ApiService);

    stats = signal<StatusCount[]>([]);
    totalItems = signal(0);

    private statusConfig: Record<string, { icon: string; color: string }> = {
        WANT: { icon: 'shopping_cart', color: '#2196f3' },
        BOUGHT: { icon: 'local_shipping', color: '#ff9800' },
        ASSEMBLED: { icon: 'build', color: '#9c27b0' },
        WIP: { icon: 'brush', color: '#f44336' },
        FINISHED: { icon: 'check_circle', color: '#4caf50' },
    };

    ngOnInit() {
        this.api.getItems().subscribe((items) => {
            const counts: Record<string, number> = {};
            for (const item of items) {
                counts[item.status] = (counts[item.status] || 0) + 1;
            }

            this.stats.set(
                Object.entries(this.statusConfig).map(([status, config]) => ({
                    status,
                    count: counts[status] || 0,
                    icon: config.icon,
                    color: config.color,
                })),
            );

            this.totalItems.set(items.length);
        });
    }
}
