import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemCardComponent } from './item-card.component';
import { Item } from '../../../classes/items';

describe('ItemCardComponent', () => {
    let fixture: ComponentFixture<ItemCardComponent>;
    let el: HTMLElement;

    const mockItem = (): Item =>
        Object.assign(new Item(), {
            id: '1',
            userId: 'u1',
            name: 'Primaris Intercessors',
            status: 'WIP' as const,
            quantity: 5,
            tags: ['Elite', 'Squad'],
            photoKey: null,
            points: null,
            purchaseDate: null,
            price: null,
            currency: 'EUR',
            notes: null,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            faction: { id: 'f1', name: 'Space Marines' },
        });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ItemCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemCardComponent);
        fixture.componentRef.setInput('item', mockItem());
        fixture.detectChanges();
        el = fixture.nativeElement;
    });

    it('renders the item name', () => {
        expect(el.querySelector('.item-card__name')?.textContent?.trim()).toBe('Primaris Intercessors');
    });

    it('renders faction name in meta', () => {
        expect(el.querySelector('.item-card__meta')?.textContent).toContain('Space Marines');
    });

    it('renders quantity in meta', () => {
        expect(el.querySelector('.item-card__meta')?.textContent).toContain('5');
    });

    it('renders status badge with correct data-status attribute', () => {
        const badge = el.querySelector('.item-card__status-badge');
        expect(badge?.getAttribute('data-status')).toBe('WIP');
    });

    it('renders status label in badge', () => {
        const badge = el.querySelector('.item-card__status-badge');
        expect(badge?.textContent?.trim()).toBe('WIP');
    });

    it('disables prev button when status is first in order', () => {
        fixture.componentRef.setInput('item', Object.assign(mockItem(), { status: 'WANT' }));
        fixture.detectChanges();
        const prevBtn = el.querySelector<HTMLButtonElement>('[data-testid="prev-status"]');
        expect(prevBtn?.disabled).toBeTrue();
    });

    it('disables next button when status is last in order', () => {
        fixture.componentRef.setInput('item', Object.assign(mockItem(), { status: 'FINISHED' }));
        fixture.detectChanges();
        const nextBtn = el.querySelector<HTMLButtonElement>('[data-testid="next-status"]');
        expect(nextBtn?.disabled).toBeTrue();
    });

    it('enables prev button when status is not first', () => {
        const prevBtn = el.querySelector<HTMLButtonElement>('[data-testid="prev-status"]');
        expect(prevBtn?.disabled).toBeFalse();
    });

    it('enables next button when status is not last', () => {
        const nextBtn = el.querySelector<HTMLButtonElement>('[data-testid="next-status"]');
        expect(nextBtn?.disabled).toBeFalse();
    });

    it('emits statusChange with next direction on next button click', () => {
        const spy = jasmine.createSpy('statusChange');
        fixture.componentInstance.statusChange.subscribe(spy);
        el.querySelector<HTMLButtonElement>('[data-testid="next-status"]')?.click();
        expect(spy).toHaveBeenCalledWith({ item: jasmine.objectContaining({ id: '1' }), direction: 'next' });
    });

    it('emits statusChange with prev direction on prev button click', () => {
        const spy = jasmine.createSpy('statusChange');
        fixture.componentInstance.statusChange.subscribe(spy);
        el.querySelector<HTMLButtonElement>('[data-testid="prev-status"]')?.click();
        expect(spy).toHaveBeenCalledWith({ item: jasmine.objectContaining({ id: '1' }), direction: 'prev' });
    });

    it('emits edit with item on edit button click', () => {
        const spy = jasmine.createSpy('edit');
        fixture.componentInstance.edit.subscribe(spy);
        el.querySelector<HTMLButtonElement>('[data-testid="edit-btn"]')?.click();
        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: '1' }));
    });

    it('emits duplicate with item on duplicate button click', () => {
        const spy = jasmine.createSpy('duplicate');
        fixture.componentInstance.duplicate.subscribe(spy);
        el.querySelector<HTMLButtonElement>('[data-testid="duplicate-btn"]')?.click();
        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: '1' }));
    });

    it('emits delete with item on delete button click', () => {
        const spy = jasmine.createSpy('delete');
        fixture.componentInstance.delete.subscribe(spy);
        el.querySelector<HTMLButtonElement>('[data-testid="delete-btn"]')?.click();
        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: '1' }));
    });

    it('shows image placeholder when no photoKey', () => {
        expect(el.querySelector('.item-card__image-placeholder')).toBeTruthy();
        expect(el.querySelector('.item-card__image img')).toBeFalsy();
    });

    it('shows image and hides placeholder when photoKey is set', () => {
        fixture.componentRef.setInput('item', Object.assign(mockItem(), { photoKey: 'some-key.jpg' }));
        fixture.detectChanges();
        expect(el.querySelector('.item-card__image img')).toBeTruthy();
        expect(el.querySelector('.item-card__image-placeholder')).toBeFalsy();
    });

    it('renders all tags', () => {
        const tags = el.querySelectorAll('.item-card__tag');
        expect(tags.length).toBe(2);
        expect(tags[0].textContent?.trim()).toBe('Elite');
        expect(tags[1].textContent?.trim()).toBe('Squad');
    });

    it('does not render tags section when tags are empty', () => {
        fixture.componentRef.setInput('item', Object.assign(mockItem(), { tags: [] }));
        fixture.detectChanges();
        expect(el.querySelector('.item-card__tags')).toBeFalsy();
    });

    describe('compact mode', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('compactMode', true);
            fixture.detectChanges();
        });

        it('renders edit button when showEdit is true', () => {
            fixture.componentRef.setInput('showEdit', true);
            fixture.detectChanges();
            expect(el.querySelector('[data-testid="edit-btn"]')).toBeTruthy();
        });

        it('does not render edit button when showEdit is false', () => {
            fixture.componentRef.setInput('showEdit', false);
            fixture.detectChanges();
            expect(el.querySelector('[data-testid="edit-btn"]')).toBeFalsy();
        });

        it('emits edit with item on edit button click in compact mode', () => {
            fixture.componentRef.setInput('showEdit', true);
            fixture.detectChanges();
            const spy = jasmine.createSpy('edit');
            fixture.componentInstance.edit.subscribe(spy);
            el.querySelector<HTMLButtonElement>('[data-testid="edit-btn"]')?.click();
            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: '1' }));
        });

        it('emits duplicate with item on duplicate button click in compact mode', () => {
            const spy = jasmine.createSpy('duplicate');
            fixture.componentInstance.duplicate.subscribe(spy);
            el.querySelector<HTMLButtonElement>('[data-testid="duplicate-btn"]')?.click();
            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: '1' }));
        });
    });
});
