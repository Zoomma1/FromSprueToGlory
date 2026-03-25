import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Item } from '../../../classes/items';
import { STATUS_LABELS, STATUS_ORDER } from '../../../classes/item.constants';

@Component({
    selector: 'app-item-card',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './item-card.component.html',
    styleUrl: './item-card.component.scss',
})
export class ItemCardComponent {
    item = input.required<Item>();

    statusChange = output<{ item: Item; direction: 'prev' | 'next' }>();
    edit = output<Item>();
    delete = output<Item>();

    statusLabel = computed(() => STATUS_LABELS[this.item().status] ?? this.item().status);
    canAdvance = computed(() => STATUS_ORDER.indexOf(this.item().status) < STATUS_ORDER.length - 1);
    canRevert = computed(() => STATUS_ORDER.indexOf(this.item().status) > 0);

    onNext(): void {
        this.statusChange.emit({ item: this.item(), direction: 'next' });
    }

    onPrev(): void {
        this.statusChange.emit({ item: this.item(), direction: 'prev' });
    }
}
