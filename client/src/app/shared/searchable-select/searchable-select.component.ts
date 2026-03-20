import { Component, forwardRef, input, output, signal, computed, effect } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-searchable-select',
    standalone: true,
    imports: [MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatIconModule, MatButtonModule],
    templateUrl: './searchable-select.component.html',
    styleUrl: './searchable-select.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SearchableSelectComponent),
            multi: true,
        },
    ],
})
export class SearchableSelectComponent<T> implements ControlValueAccessor {
    options = input.required<T[]>();
    displayFn = input.required<(option: T) => string>();
    label = input.required<string>();
    placeholder = input('Search...');
    nullOptionLabel = input<string | null>(null);
    value = input<T | null>(null);

    valueChange = output<T | null>();

    internalValue = signal<T | null>(null);
    searchQuery = signal('');
    isDisabled = signal(false);

    private cvaMode = false;
    private onChange: (v: T | null) => void = () => {};
    private onTouched: () => void = () => {};

    constructor() {
        effect(() => {
            if (!this.cvaMode) {
                this.internalValue.set(this.value());
            }
        });
    }

    // Used by [value] binding on the input: shows display name of selected value.
    // While user is typing, internalValue doesn't change so Angular won't reset the input.
    inputDisplayValue = computed(() =>
        this.internalValue() ? this.displayFn()(this.internalValue()!) : ''
    );

    filteredOptions = computed(() => {
        const q = this.searchQuery().toLowerCase();
        if (!q) return this.options();
        return this.options().filter(o => this.displayFn()(o).toLowerCase().includes(q));
    });

    // Used by mat-autocomplete [displayWith] to render selected value text after selection.
    readonly autocompleteDisplayFn = (value: T | null): string => {
        return value ? this.displayFn()(value) : '';
    };

    onInput(text: string): void {
        this.searchQuery.set(text);
    }

    onClosed(): void {
        this.searchQuery.set('');
    }

    onSelectionChange(v: T | null): void {
        this.internalValue.set(v);
        this.searchQuery.set('');
        this.onChange(v);
        this.onTouched();
        this.valueChange.emit(v);
    }

    clear(): void {
        this.internalValue.set(null);
        this.searchQuery.set('');
        this.onChange(null);
        this.onTouched();
        this.valueChange.emit(null);
    }

    writeValue(v: T | null): void {
        this.internalValue.set(v);
    }

    registerOnChange(fn: (v: T | null) => void): void {
        this.cvaMode = true;
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.isDisabled.set(disabled);
    }
}
