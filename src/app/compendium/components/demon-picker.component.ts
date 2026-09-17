import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PickerBase } from '../../shared/search/picker-base';
import { OwnedStarComponent } from './owned-star.component';

import { Demon } from '../models';
import { parseQuery } from '../../shared/search/query-parser';
import { compileDemonFilter, displayLvl } from '../models/demon-filter';
import { PlayerStateService } from '../../shared/player/player-state.service';

// The picker understands the same query language as the lists, so have:yes
// narrows it to the demons you have starred.
export function filterDemons(demons: Demon[], filter: string, owned?: Set<string>): Demon[] {
  const query = parseQuery(filter);

  if (query.isEmpty) { return demons; }

  const compiled = compileDemonFilter(query, { owned: owned || new Set<string>() });

  return compiled.unknownTerms.length < query.terms.length
    ? demons.filter(compiled.predicate)
    : demons;
}

// Replaces a plain <select> of a few hundred names: you type to narrow, and you
// can see the level and race of each candidate while choosing.
@Component({
  selector: 'app-demon-picker',
  imports: [CommonModule, OwnedStarComponent],
  template: `
    <div class="picker" (focusout)="onFocusOut($event)">
      <input #field
        type="text"
        class="picker-field"
        spellcheck="false"
        autocomplete="off"
        [value]="open() ? filter() : selected()"
        [placeholder]="placeholder()"
        (focus)="onFocus()"
        (input)="onInput($any($event.target).value)"
        (keydown)="onKeydown($event)">
      @if (open()) {
        <div class="picker-panel">
          <ul class="picker-list" role="listbox">
            @if (!matches().length) {
              <li class="picker-empty">No match</li>
            }
            @for (demon of matches(); track demon.name; let i = $index) {
              <li role="option"
                [class.active]="i === highlight()"
                (mousedown)="pick(demon.name, $event)"
                (mousemove)="highlight.set(i)">
                <app-owned-star [name]="demon.name" [readonly]="true"></app-owned-star>
                <span class="lvl">{{ lvlOf(demon) }}</span>
                <span class="race">{{ demon.race }}</span>
                <span class="name">{{ demon.name }}</span>
                @if (countOf(demon)) { <span class="count">{{ countOf(demon) }}</span> }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .picker { position: relative; }
    .picker-field {
      width: 100%;
      box-sizing: border-box;
      min-height: 25px;
      padding: 0.2em 0.4em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    .picker-field:focus { outline: none; border-color: #66BBFF; }
    /* Width lives on the panel and scrolling on the list inside it: putting
       both on one element makes overflow-x clip instead of letting it grow. */
    .picker-panel {
      position: absolute;
      z-index: 20;
      left: 0;
      min-width: 100%;
      width: max-content;
      max-width: 30em;
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
      align-items: baseline;
      gap: 0.5em;
      padding: 0.2em 0.4em;
      cursor: pointer;
      white-space: nowrap;
    }
    .picker-list li.active { background-color: #333333; }
    .picker-list li.picker-empty { color: #888888; cursor: default; }
    .picker-list .lvl {
      flex: 0 0 2.5em;
      text-align: right;
      color: #aaaaaa;
      font-variant-numeric: tabular-nums;
    }
    .picker-list .race { flex: 0 0 auto; min-width: 6em; color: #aaaaaa; }
    .picker-list .name { flex: 0 0 auto; }
    .picker-list .count { flex: 0 0 auto; color: #777777; }
  `]
})
export class DemonPickerComponent extends PickerBase {
  demons = input<Demon[]>([]);
  selected = input('');
  placeholder = input('');
  counts = input<{ [name: string]: number }>(null);
  picked = output<string>();

  private playerState = inject(PlayerStateService);

  matches = computed(() =>
    filterDemons(this.demons(), this.filter(), this.playerState.owned$()));

  lvlOf(demon: Demon): string {
    return demon.lvl ? `${displayLvl(demon.lvl)}` : '';
  }

  countOf(demon: Demon): string {
    const counts = this.counts();
    return counts && counts[demon.name] !== undefined ? `(${counts[demon.name]})` : '';
  }

  protected matchCount(): number {
    return this.matches().length;
  }

  protected pickAt(index: number) {
    const match = this.matches()[index];

    if (match) { this.pick(match.name); }
  }

  pick(name: string, event?: Event) {
    if (event) { event.preventDefault(); }

    this.picked.emit(name);
    this.close();
  }
}
