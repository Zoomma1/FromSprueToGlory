// ──────────────────────────────────────────────────────────
// 📊 Dashboard Component — Stats + Overview
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { Item } from '../../classes/items';
import { EXCHANGE_RATES } from '../../classes/exchange-rates';

interface StatusCount {
    status: string;
    count: number;
    icon: string;
    color: string;
}

interface WastedMoneyResult {
    total: number;
    currency: string;
    projectBreakdown: { project: string; total: number }[];
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink, MatTooltipModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
    private api    = inject(ApiService);
    private router = inject(Router);

    stats = signal<StatusCount[]>([]);
    allItems = signal<Item[]>([]);
    totalItems = signal(0);
    preferredCurrency = signal('EUR');

    wastedMoney = computed((): WastedMoneyResult | null => {
        const currency = this.preferredCurrency();
        const eligibleItems = this.allItems().filter(
            (item) => !!item.price && item.status !== 'WANT' && item.status !== 'FINISHED',
        );

        if (eligibleItems.length === 0) return null;

        const convert = (amount: number, from: string): number => {
            const fromRate = EXCHANGE_RATES[from] ?? 1;
            const toRate = EXCHANGE_RATES[currency] ?? 1;
            return amount * (toRate / fromRate);
        };

        const total = eligibleItems.reduce(
            (sum, item) => sum + convert(item.price!, item.currency),
            0,
        );

        const byProject = eligibleItems.reduce((map, item) => {
            const projectName = item.project?.name ?? 'No Project';
            map.set(projectName, (map.get(projectName) ?? 0) + convert(item.price!, item.currency));
            return map;
        }, new Map<string, number>());

        const projectBreakdown = Array.from(byProject, ([project, projectTotal]) => ({
            project,
            total: projectTotal,
        }));

        return { total, currency, projectBreakdown };
    });

    private statusConfig: Record<string, { icon: string; color: string }> = {
        WANT: { icon: 'shopping_cart', color: '#2196f3' },
        BOUGHT: { icon: 'local_shipping', color: '#ff9800' },
        ASSEMBLED: { icon: 'build', color: '#9c27b0' },
        WIP: { icon: 'brush', color: '#f44336' },
        FINISHED: { icon: 'check_circle', color: '#4caf50' },
    };

    navigateToItems(status: string) {
        this.router.navigate(['/items'], { queryParams: { status } });
    }

    ngOnInit() {
        this.api.getMe().subscribe({
            next: (profile) => this.preferredCurrency.set(profile.currency),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            error: () => {},
        });

        this.api.getItems().subscribe({
            next: (items) => {
                this.allItems.set(items);
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
            },
            error: () => {
                this.stats.set([]);
                this.totalItems.set(0);
            },
        });
    }
}
