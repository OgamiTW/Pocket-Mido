import { Directive, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { PickerRegistryService } from './picker-registry.service';

// Shared behaviour for the type-to-filter dropdowns: open/close, the filter
// text, and keyboard navigation. Subclasses supply the list and the picking.
@Directive()
export abstract class PickerBase {
  @ViewChild('field') field: ElementRef<HTMLInputElement>;

  private host = inject(ElementRef<HTMLElement>);
  private registry = inject(PickerRegistryService);

  open = signal(false);
  filter = signal('');
  highlight = signal(0);

  protected abstract matchCount(): number;
  protected abstract pickAt(index: number): void;

  onFocus() {
    this.filter.set('');
    this.highlight.set(0);
    this.openUp();
  }

  onInput(value: string) {
    this.filter.set(value);
    this.highlight.set(0);
    this.openUp();
  }

  onFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as HTMLElement;

    // Only focus moving inside *this* picker keeps it open: `.picker` alone
    // would also match a different picker the user just clicked into.
    if (next && this.host.nativeElement.contains(next)) { return; }

    this.close();
  }

  onKeydown(event: KeyboardEvent) {
    const count = this.matchCount();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        this.highlight.update(i => Math.min(i + 1, count - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.highlight.update(i => Math.max(i - 1, 0));
        return;
      case 'Enter':
        event.preventDefault();
        if (this.open() && count) { this.pickAt(this.highlight()); }
        return;
      case 'Escape':
        event.preventDefault();
        this.close();
        return;
      default:
        return;
    }
  }

  close() {
    this.open.set(false);
    this.filter.set('');
    this.registry.closed(this);
    this.field?.nativeElement.blur();
  }

  private openUp() {
    this.open.set(true);
    this.registry.opened(this);
  }
}
