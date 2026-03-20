import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchableSelectComponent } from './searchable-select.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

interface TestOption {
  id: string;
  name: string;
}

describe('SearchableSelectComponent', () => {
  const testOptions: TestOption[] = [
    { id: '1', name: 'Basecoat' },
    { id: '2', name: 'Drybrush' },
    { id: '3', name: 'Base Layer' },
  ];

  let component: SearchableSelectComponent<TestOption>;
  let fixture: ComponentFixture<SearchableSelectComponent<TestOption>>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SearchableSelectComponent],
      providers: [provideAnimationsAsync()],
    });

    fixture = TestBed.createComponent(SearchableSelectComponent) as ComponentFixture<SearchableSelectComponent<TestOption>>;
    component = fixture.componentInstance;

    fixture.componentRef.setInput('options', testOptions);
    fixture.componentRef.setInput('displayFn', (o: TestOption) => o.name);
    fixture.componentRef.setInput('label', 'Test');
    fixture.detectChanges();
  });

  describe('filteredOptions', () => {
    it('should return all options when search query is empty', () => {
      expect(component.filteredOptions()).toEqual(testOptions);
    });

    it('should filter options by displayFn result (case insensitive)', () => {
      component.searchQuery.set('base');
      expect(component.filteredOptions()).toEqual([
        { id: '1', name: 'Basecoat' },
        { id: '3', name: 'Base Layer' },
      ]);
    });

    it('should match uppercase query against lowercase names', () => {
      component.searchQuery.set('DRY');
      expect(component.filteredOptions()).toEqual([{ id: '2', name: 'Drybrush' }]);
    });

    it('should return empty array when no option matches the query', () => {
      component.searchQuery.set('zzz');
      expect(component.filteredOptions()).toEqual([]);
    });

    it('should return all options when query is reset to empty', () => {
      component.searchQuery.set('base');
      component.searchQuery.set('');
      expect(component.filteredOptions()).toEqual(testOptions);
    });
  });

  describe('inputDisplayValue', () => {
    it('should return empty string when no value is selected', () => {
      expect(component.inputDisplayValue()).toBe('');
    });

    it('should return displayFn result when a value is selected', () => {
      component.internalValue.set(testOptions[0]);
      expect(component.inputDisplayValue()).toBe('Basecoat');
    });
  });

  describe('onInput', () => {
    it('should update searchQuery', () => {
      component.onInput('base');
      expect(component.searchQuery()).toBe('base');
    });

    it('should NOT change internalValue', () => {
      component.internalValue.set(testOptions[0]);
      component.onInput('base');
      expect(component.internalValue()).toEqual(testOptions[0]);
    });
  });

  describe('onClosed', () => {
    it('should reset searchQuery when autocomplete closes', () => {
      component.searchQuery.set('base');
      component.onClosed();
      expect(component.searchQuery()).toBe('');
    });
  });

  describe('clear', () => {
    it('should set internalValue to null', () => {
      component.internalValue.set(testOptions[0]);
      component.clear();
      expect(component.internalValue()).toBeNull();
    });

    it('should reset searchQuery', () => {
      component.searchQuery.set('base');
      component.clear();
      expect(component.searchQuery()).toBe('');
    });

    it('should emit null via valueChange', () => {
      const spy = jasmine.createSpy('valueChange');
      component.valueChange.subscribe(spy);
      component.clear();
      expect(spy).toHaveBeenCalledWith(null);
    });

    it('should call onChange and onTouched callbacks', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnChange(onChangeSpy);
      component.registerOnTouched(onTouchedSpy);
      component.clear();
      expect(onChangeSpy).toHaveBeenCalledWith(null);
      expect(onTouchedSpy).toHaveBeenCalled();
    });
  });

  describe('ControlValueAccessor', () => {
    it('should update internalValue when writeValue is called', () => {
      component.writeValue(testOptions[0]);
      expect(component.internalValue()).toEqual(testOptions[0]);
    });

    it('should set internalValue to null when writeValue receives null', () => {
      component.writeValue(testOptions[0]);
      component.writeValue(null);
      expect(component.internalValue()).toBeNull();
    });

    it('should call onChange callback when selection changes', () => {
      const spy = jasmine.createSpy('onChange');
      component.registerOnChange(spy);
      component.onSelectionChange(testOptions[1]);
      expect(spy).toHaveBeenCalledWith(testOptions[1]);
    });

    it('should call onTouched callback when selection changes', () => {
      const spy = jasmine.createSpy('onTouched');
      component.registerOnTouched(spy);
      component.onSelectionChange(testOptions[1]);
      expect(spy).toHaveBeenCalled();
    });

    it('should update internalValue when selection changes', () => {
      component.onSelectionChange(testOptions[2]);
      expect(component.internalValue()).toEqual(testOptions[2]);
    });

    it('should reset searchQuery when selection changes', () => {
      component.searchQuery.set('base');
      component.onSelectionChange(testOptions[0]);
      expect(component.searchQuery()).toBe('');
    });

    it('should update isDisabled when setDisabledState is called', () => {
      component.setDisabledState(true);
      expect(component.isDisabled()).toBeTrue();
      component.setDisabledState(false);
      expect(component.isDisabled()).toBeFalse();
    });
  });

  describe('valueChange output', () => {
    it('should emit valueChange when selection changes', () => {
      const spy = jasmine.createSpy('valueChange');
      component.valueChange.subscribe(spy);
      component.onSelectionChange(testOptions[0]);
      expect(spy).toHaveBeenCalledWith(testOptions[0]);
    });

    it('should emit null when null is selected', () => {
      const spy = jasmine.createSpy('valueChange');
      component.valueChange.subscribe(spy);
      component.onSelectionChange(null);
      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('direct binding mode (value input)', () => {
    it('should sync internalValue from value input when not in CVA mode', () => {
      fixture.componentRef.setInput('value', testOptions[0]);
      fixture.detectChanges();
      expect(component.internalValue()).toEqual(testOptions[0]);
    });

    it('should update internalValue when value input changes', () => {
      fixture.componentRef.setInput('value', testOptions[0]);
      fixture.detectChanges();
      fixture.componentRef.setInput('value', testOptions[1]);
      fixture.detectChanges();
      expect(component.internalValue()).toEqual(testOptions[1]);
    });

    it('should NOT override internalValue from value input when in CVA mode', () => {
      const spy = jasmine.createSpy('onChange');
      component.registerOnChange(spy);
      component.writeValue(testOptions[2]);

      fixture.componentRef.setInput('value', testOptions[0]);
      fixture.detectChanges();

      expect(component.internalValue()).toEqual(testOptions[2]);
    });
  });
});
