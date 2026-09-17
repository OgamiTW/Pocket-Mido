import { Component, ElementRef, HostListener, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SavedFilterService } from './saved-filter.service';

export interface SearchHint {
  syntax: string;
  desc: string;
}

@Component({
  selector: 'app-search-bar',
  imports: [CommonModule],
  template: `
    <div class="search-bar">
      <input #searchInput
        type="text"
        class="search-input"
        spellcheck="false"
        autocomplete="off"
        [value]="query()"
        [placeholder]="placeholder()"
        (input)="queryChanged.emit($any($event.target).value)"
        (keydown)="onKeydown($event)">
      @if (query()) {
        <button type="button" class="search-btn" title="Clear filter" (click)="clear()">&#10005;</button>
      }
      <span class="search-count" [class.search-empty]="matchCount() === 0 && totalCount() > 0">
        {{ matchCount() }} / {{ totalCount() }}
      </span>
      @if (hints().length) {
        <button type="button" class="search-btn" title="Filter syntax" (click)="showHelp = !showHelp">?</button>
      }
      @if (saveContext()) {
        @if (saved().length) {
          <select class="search-saved" title="Apply a saved filter" (change)="applySaved($any($event.target))">
            <option value="">Saved&hellip;</option>
            @for (filter of saved(); track filter.name) {
              <option [value]="filter.name">{{ filter.name }}</option>
            }
          </select>
        }
        @if (matchingSaved()) {
          <button type="button" class="search-btn" title="Forget this saved filter"
            (click)="unsave()">Unsave</button>
        } @else if (query()) {
          <button type="button" class="search-btn" title="Save this filter for later"
            (click)="startSaving()">Save</button>
        }
      }
    </div>
    @if (saving()) {
      <div class="search-save-row">
        <input #saveField type="text" class="search-input" placeholder="Name this filter"
          (keydown)="onSaveKeydown($event, $any($event.target).value)">
        <button type="button" class="search-btn"
          (click)="confirmSave(saveField.value)">Save</button>
        <button type="button" class="search-btn" (click)="saving.set(false)">Cancel</button>
      </div>
    }
    @if (unknownTerms().length) {
      <div class="search-note">Ignored, not a known filter: {{ unknownTerms().join(', ') }}</div>
    }
    @if (showHelp) {
      <dl class="search-help">
        @for (hint of hints(); track hint.syntax) {
          <div><dt>{{ hint.syntax }}</dt><dd>{{ hint.desc }}</dd></div>
        }
      </dl>
    }
  `,
  styles: [`
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.4em;
      font-weight: normal;
    }
    .search-input {
      flex: 1 1 auto;
      min-width: 6em;
      padding: 0.25em 0.4em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    .search-input:focus {
      outline: none;
      border-color: #66BBFF;
    }
    .search-btn {
      flex: 0 0 auto;
      padding: 0.2em 0.5em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
    }
    .search-btn:hover { color: yellow; }
    .search-count {
      flex: 0 0 auto;
      color: #aaaaaa;
      font-size: 0.9em;
      white-space: nowrap;
    }
    .search-count.search-empty { color: #ff8888; }
    .search-saved {
      flex: 0 0 auto;
      padding: 0.2em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    .search-save-row {
      display: flex;
      align-items: center;
      gap: 0.4em;
      padding-top: 0.35em;
    }
    .search-note {
      padding-top: 0.3em;
      color: #ffcc66;
      font-weight: normal;
      font-size: 0.9em;
      text-align: left;
    }
    .search-help {
      margin: 0.4em 0 0 0;
      font-weight: normal;
      font-size: 0.9em;
      text-align: left;
    }
    .search-help div {
      display: flex;
      gap: 0.6em;
      padding: 0.1em 0;
    }
    .search-help dt {
      flex: 0 0 11em;
      color: #66BBFF;
      font-family: monospace;
      white-space: nowrap;
    }
    .search-help dd { margin: 0; color: #cccccc; }
  `]
})
export class SearchBarComponent {
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;

  query = input('');
  placeholder = input('');
  hints = input<SearchHint[]>([]);
  matchCount = input(0);
  totalCount = input(0);
  unknownTerms = input<string[]>([]);
  hotkey = input(false);
  saveContext = input('');
  queryChanged = output<string>();

  private savedFilters = inject(SavedFilterService);

  showHelp = false;
  saving = signal(false);

  saved = computed(() => this.saveContext() ? this.savedFilters.list(this.saveContext()) : []);
  matchingSaved = computed(() => this.saved().find(filter => filter.query === this.query()));

  applySaved(select: HTMLSelectElement) {
    const found = this.saved().find(filter => filter.name === select.value);

    select.value = '';
    if (found) { this.queryChanged.emit(found.query); }
  }

  startSaving() {
    this.saving.set(true);
  }

  confirmSave(name: string) {
    this.savedFilters.save(this.saveContext(), name, this.query());
    this.saving.set(false);
  }

  unsave() {
    this.savedFilters.remove(this.saveContext(), this.matchingSaved().name);
  }

  onSaveKeydown(event: KeyboardEvent, name: string) {
    if (event.key === 'Enter') { event.preventDefault(); this.confirmSave(name); }
    if (event.key === 'Escape') { event.preventDefault(); this.saving.set(false); }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') { return; }

    event.preventDefault();

    if (this.query()) { this.queryChanged.emit(''); } else { this.searchInput?.nativeElement.blur(); }
  }

  clear() {
    this.queryChanged.emit('');
    this.focus();
  }

  focus() {
    this.searchInput?.nativeElement.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onHotkey(event: KeyboardEvent) {
    if (!this.hotkey() || event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey) { return; }

    const target = event.target as HTMLElement;

    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) { return; }

    event.preventDefault();
    this.focus();
  }
}
