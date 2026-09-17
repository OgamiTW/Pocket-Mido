import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SkillPanelState, readSkillPanel, writeSkillPanel } from '../models/skill-panel-query';
import { ElemPickerComponent, ElemOption } from './elem-picker.component';
import { translateElementLabel } from '../models/translator';

// Buttons for the skill filters worth reaching for. Everything else in the
// query language still works by typing.
@Component({
  selector: 'app-skill-filter-panel',
  imports: [CommonModule, ElemPickerComponent],
  template: `
    @let state = state$();
    <div class="skill-filters">
      @if (elems().length) {
        <span class="label">Elem</span>
        <span class="elem-slot">
          <app-elem-picker
            [options]="elemOptions$()"
            [selected]="state.elem || '-'"
            placeholder="Any"
            (picked)="setElem($event)">
          </app-elem-picker>
        </span>
      }

      <span class="label">Cost</span>
      <input type="number" class="num" min="0" placeholder="min"
        [value]="state.costMin"
        (input)="setCost($any($event.target).value, state.costMax)">
      <span class="dash">&ndash;</span>
      <input type="number" class="num" min="0" placeholder="max"
        [value]="state.costMax"
        (input)="setCost(state.costMin, $any($event.target).value)">

      <span class="label">Rank</span>
      <input type="number" class="num" min="0" placeholder="min"
        [value]="state.rankMin"
        (input)="setRank($any($event.target).value, state.rankMax)">
      <span class="dash">&ndash;</span>
      <input type="number" class="num" min="0" placeholder="max"
        [value]="state.rankMax"
        (input)="setRank(state.rankMin, $any($event.target).value)">

      @if (targets().length) {
        <span class="label">Target</span>
        <select (change)="setTarget($any($event.target).value)">
          <option value="" [selected]="!state.target">Any</option>
          @for (target of targets(); track target) {
            <option [value]="target" [selected]="target === state.target">{{ target }}</option>
          }
        </select>
      }

      <button type="button" title="Back to the default row order"
        (click)="sortReset.emit()">Reset sort</button>
      <button type="button" [disabled]="!query()" (click)="cleared.emit()">Clear</button>
    </div>
  `,
  styles: [`
    .skill-filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35em;
      padding-top: 0.35em;
      font-weight: normal;
    }
    .label { color: #aaaaaa; font-size: 0.9em; }
    .dash { color: #aaaaaa; }
    .elem-slot { display: inline-block; min-width: 8em; }
    input.num {
      width: 4em;
      padding: 0.2em 0.3em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    input.num:focus, select:focus { outline: none; border-color: #66BBFF; }
    select {
      padding: 0.2em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    button {
      padding: 0.2em 0.5em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
      font: inherit;
    }
    button:hover:not(:disabled) { color: yellow; }
    button:disabled { opacity: 0.4; cursor: default; }
  `]
})
export class SkillFilterPanelComponent {
  query = input('');
  elems = input<string[]>([]);
  targets = input<string[]>([]);
  lang = input('en');
  queryChanged = output<string>();
  cleared = output<void>();
  sortReset = output<void>();

  state$ = computed(() => readSkillPanel(this.query(), this.elems(), this.targets()));

  elemOptions$ = computed<ElemOption[]>(() => [{ elem: '-', label: 'Any' }].concat(
    this.elems().map(elem => ({ elem, label: translateElementLabel(elem, this.lang()) }))
  ));

  setElem(elem: string) {
    this.emit(Object.assign({}, this.state$(), { elem: elem === '-' ? '' : elem }));
  }

  setTarget(target: string) {
    this.emit(Object.assign({}, this.state$(), { target }));
  }

  setCost(costMin: string, costMax: string) {
    this.emit(Object.assign({}, this.state$(), { costMin, costMax }));
  }

  setRank(rankMin: string, rankMax: string) {
    this.emit(Object.assign({}, this.state$(), { rankMin, rankMax }));
  }

  private emit(state: SkillPanelState) {
    this.queryChanged.emit(writeSkillPanel(state));
  }
}
