import { Injectable } from '@angular/core';

export interface ClosablePicker {
  close(): void;
}

// Only one dropdown should be open at a time. Focus alone is not enough to
// guarantee that, so whoever opens announces it and the previous one closes.
@Injectable({ providedIn: 'root' })
export class PickerRegistryService {
  private current: ClosablePicker = null;

  opened(picker: ClosablePicker) {
    if (this.current && this.current !== picker) { this.current.close(); }

    this.current = picker;
  }

  closed(picker: ClosablePicker) {
    if (this.current === picker) { this.current = null; }
  }
}
