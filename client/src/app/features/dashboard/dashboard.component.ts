// ──────────────────────────────────────────────────────────
// 📊 Dashboard Component — Stats + Overview
// ──────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { Item } from '../../classes/items';

interface StatusCount {
    status: string;
    count: number;
    icon: string;
    color: string;
}

interface WasterMoneyResultBreakdown {
    breakdown: {
      currency: string;
      amount: number
    }[];
}

interface WasterMoneyResult extends WasterMoneyResultBreakdown {
    projectBreakdown: {
      project: string;
      wastedMoneyBreakdown: WasterMoneyResultBreakdown
    }[];
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink, MatTooltipModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
    private api = inject(ApiService);

    stats = signal<StatusCount[]>([]);
    allItems = signal<Item[]>([]);
    totalItems = signal(0);

    wastedMoney = computed((): WasterMoneyResult | null => {
        const eligibleItems = this.allItems().filter(
            (item) => !!item.price && item.status !== 'WANT' && item.status !== 'FINISHED',
        );

        if (eligibleItems.length === 0) return null;

        const globalBreakdown = Array.from(
            eligibleItems.reduce((map, item) => {
                map.set(item.currency, (map.get(item.currency) ?? 0) + item.price!);
                return map;
            }, new Map<string, number>()),
            ([currency, amount]) => ({ currency, amount }),
        );

        const byProject = eligibleItems.reduce((map, item) => {
            const projectName = item.project?.name ?? 'No Project';
            map.set(projectName, [...(map.get(projectName) ?? []), item]);
            return map;
        }, new Map<string, Item[]>());

        const projectBreakdown = Array.from(byProject, ([project, items]) => ({
            project,
            wastedMoneyBreakdown: {
                breakdown: Array.from(
                    items.reduce((map, item) => {
                        map.set(item.currency, (map.get(item.currency) ?? 0) + item.price!);
                        return map;
                    }, new Map<string, number>()),
                    ([currency, amount]) => ({ currency, amount }),
                ),
            },
        }));

        return { breakdown: globalBreakdown, projectBreakdown };
    });

    private statusConfig: Record<string, { icon: string; color: string }> = {
        WANT: { icon: 'shopping_cart', color: '#2196f3' },
        BOUGHT: { icon: 'local_shipping', color: '#ff9800' },
        ASSEMBLED: { icon: 'build', color: '#9c27b0' },
        WIP: { icon: 'brush', color: '#f44336' },
        FINISHED: { icon: 'check_circle', color: '#4caf50' },
    };

    ngOnInit() {
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
