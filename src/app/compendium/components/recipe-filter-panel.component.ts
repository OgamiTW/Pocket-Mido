import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RecipePanelState, readRecipePanel, writeRecipePanel } from '../models/recipe-panel-query';
import { nextHaveState } from '../models/panel-terms';
import { ElemPickerComponent, ElemOption } from './elem-picker.component';
import { translateElementLabel } from '../models/translator';

// The handful of recipe filters worth a button, for the fusion tabs on a
// demon's page. Everything else stays available by typing.
@Component({
  selector: 'app-recipe-filter-panel',
  imports: [CommonModule, ElemPickerComponent],
  template: `
    @let state = state$();
    <div class="recipe-filters">
      <span class="label">Ingredient lvl</span>
      <input type="number" class="lvl" min="1" placeholder="min"
        [value]="state.lvlMin"
        (input)="setLvl($any($event.target).value, state.lvlMax)">
      <span class="dash">&ndash;</span>
      <input type="number" class="lvl" min="1" placeholder="max"
        [value]="state.lvlMax"
        (input)="setLvl(state.lvlMin, $any($event.target).value)">

      @if (inheritElems().length) {
        <span class="label">Brings</span>
        <span class="elem-slot">
          <app-elem-picker
            [options]="elemOptions$()"
            [selected]="state.inherit || '-'"
            placeholder="Any skill"
            (picked)="setInherit($event)">
          </app-elem-picker>
        </span>
      }

      <button type="button"
        [ngClass]="['have-toggle', state.have || 'off']"
        title="Filter by the demons you have starred"
        (click)="cycleHave(state)">
        {{ haveLabel(state.have) }}
      </button>

      <button type="button" title="Back to the default row order"
        (click)="sortReset.emit()">Reset sort</button>
      <button type="button" [disabled]="!query()" (click)="cleared.emit()">Clear</button>
    </div>
  `,
  styles: [`
    .recipe-filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35em;
      padding-top: 0.35em;
      font-weight: normal;
    }
    .label { color: #aaaaaa; font-size: 0.9em; }
    .dash { color: #aaaaaa; }
    .elem-slot { display: inline-block; min-width: 9em; }
    input.lvl {
      width: 4.5em;
      padding: 0.2em 0.3em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    input.lvl:focus { outline: none; border-color: #66BBFF; }
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
    .have-toggle.yes { border-color: gold; color: gold; }
    .have-toggle.no { border-color: #888888; color: #bbbbbb; }
  `]
})
export class RecipeFilterPanelComponent {
  query = input('');
  inheritElems = input<string[]>([]);
  lang = input('en');
  queryChanged = output<string>();
  cleared = output<void>();
  sortReset = output<void>();

  state$ = computed(() => readRecipePanel(this.query(), this.inheritElems()));

  elemOptions$ = computed<ElemOption[]>(() => [{ elem: '-', label: 'Any skill' }].concat(
    this.inheritElems().map(elem => ({ elem, label: translateElementLabel(elem, this.lang()) }))
  ));

  haveLabel(have: string): string {
    return have ? `Owned: ${have}` : 'Owned: any';
  }

  setLvl(lvlMin: string, lvlMax: string) {
    this.emit(Object.assign({}, this.state$(), { lvlMin, lvlMax }));
  }

  setInherit(inherit: string) {
    this.emit(Object.assign({}, this.state$(), { inherit: inherit === '-' ? '' : inherit }));
  }

  cycleHave(state: RecipePanelState) {
    this.emit(Object.assign({}, state, { have: nextHaveState(state.have) }));
  }

  private emit(state: RecipePanelState) {
    this.queryChanged.emit(writeRecipePanel(state));
  }
}
