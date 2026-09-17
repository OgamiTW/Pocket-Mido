import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PickerBase } from '../../shared/search/picker-base';

export interface ElemOption {
  elem: string;
  label: string;
}

export function filterElems(options: ElemOption[], filter: string): ElemOption[] {
  const needle = (filter || '').trim().toLocaleLowerCase();

  if (!needle) { return options; }

  return options.filter(option =>
    option.label.toLocaleLowerCase().includes(needle) ||
    option.elem.toLocaleLowerCase().includes(needle)
  );
}

// A native <select> cannot render the element sprites, so this is the same
// dropdown as the other pickers with the icon shown next to each name.
@Component({
  selector: 'app-elem-picker',
  imports: [CommonModule],
  template: `
    <div class="picker" (focusout)="onFocusOut($event)">
      <div class="field-wrap">
        @if (!open() && selected() !== '-') {
          <div class="element-icon {{ selected() }}"></div>
        }
        <input #field
          type="text"
          class="picker-field"
          spellcheck="false"
          autocomplete="off"
          [value]="open() ? filter() : selectedLabel()"
          [placeholder]="placeholder()"
          (focus)="onFocus()"
          (input)="onInput($any($event.target).value)"
          (keydown)="onKeydown($event)">
      </div>
      @if (open()) {
        <div class="picker-panel">
          <ul class="picker-list" role="listbox">
            @if (!matches().length) {
              <li class="picker-empty">No match</li>
            }
            @for (option of matches(); track option.elem; let i = $index) {
              <li role="option"
                [class.active]="i === highlight()"
                (mousedown)="pick(option.elem, $event)"
                (mousemove)="highlight.set(i)">
                @if (option.elem !== '-') {
                  <div class="element-icon {{ option.elem }}"></div>
                } @else {
                  <span class="no-icon"></span>
                }
                <span class="label">{{ option.label }}</span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .picker { position: relative; }
    .field-wrap {
      display: flex;
      align-items: center;
      gap: 0.3em;
      padding-left: 0.25em;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
    }
    .field-wrap:focus-within { border-color: #66BBFF; }
    .field-wrap .element-icon { flex: 0 0 18px; width: 18px; height: 18px; background-size: 18px; }
    .picker-field {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      min-height: 23px;
      padding: 0.2em 0.3em;
      color: white;
      background-color: transparent;
      border: 0;
      font: inherit;
    }
    .picker-field:focus { outline: none; }
    .picker-panel {
      position: absolute;
      z-index: 20;
      left: 0;
      min-width: 100%;
      width: max-content;
      max-width: 18em;
      background-color: #1b1b1b;
      border: solid 1px #444444;
      border-radius: 3.5px;
      overflow: hidden;
    }
    .picker-list {
      margin: 0;
      padding: 0;
      max-height: 16em;
      overflow-y: auto;
      list-style: none;
    }
    .picker-list li {
      display: flex;
      align-items: center;
      gap: 0.4em;
      padding: 0.2em 0.4em;
      cursor: pointer;
      white-space: nowrap;
    }
    .picker-list li.active { background-color: #333333; }
    .picker-list li.picker-empty { color: #888888; cursor: default; }
    .picker-list .element-icon, .no-icon {
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      background-size: 18px;
    }
  `]
})
export class ElemPickerComponent extends PickerBase {
  options = input<ElemOption[]>([]);
  selected = input('-');
  placeholder = input('');
  picked = output<string>();

  matches = computed(() => filterElems(this.options(), this.filter()));
  selectedLabel = computed(() => {
    const found = this.options().find(option => option.elem === this.selected());
    return found ? found.label : this.selected();
  });

  protected matchCount(): number {
    return this.matches().length;
  }

  protected pickAt(index: number) {
    const match = this.matches()[index];

    if (match) { this.pick(match.elem); }
  }

  pick(elem: string, event?: Event) {
    if (event) { event.preventDefault(); }

    this.picked.emit(elem);
    this.close();
  }
}
