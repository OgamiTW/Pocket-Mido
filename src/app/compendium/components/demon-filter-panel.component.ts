import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlayerStateService } from '../../shared/player/player-state.service';

import { HAVE_STATES, PanelState, RESIST_STATES, readPanelState, writePanelState } from '../models/filter-panel-query';
import { translateElementLabel } from '../models/translator';

const STATE_LABELS: { [code: string]: string } = {
  wk: 'weak', rs: 'resist', nu: 'null', rp: 'repel', ab: 'drain'
};

@Component({
  selector: 'app-demon-filter-panel',
  imports: [CommonModule],
  template: `
    @let state = state$();
    <div class="filter-panel">
      <div class="filter-row">
        <span class="filter-label">Lvl</span>
        <input type="number" class="lvl" min="1" placeholder="min"
          [value]="state.lvlMin"
          (input)="setLvl($any($event.target).value, state.lvlMax)">
        <span class="dash">&ndash;</span>
        <input type="number" class="lvl" min="1" placeholder="max"
          [value]="state.lvlMax"
          (input)="setLvl(state.lvlMin, $any($event.target).value)">

        @if (races().length) {
          <span class="filter-label">Race</span>
          <select (change)="setRace($any($event.target).value)">
            <option value="" [selected]="!state.race">Any</option>
            @for (race of races(); track race) {
              <option [value]="race" [selected]="race === state.race">{{ race }}</option>
            }
          </select>
        }

        <span class="filter-label">My lvl</span>
        <input type="number" class="lvl" min="1" placeholder="&ndash;"
          title="Your level in game: demons and recipes beyond it are dimmed"
          [value]="playerLvl$() || ''"
          (input)="setPlayerLvl($any($event.target).value)">

        <button type="button"
          [ngClass]="['have-toggle', state.have || 'off']"
          title="Filter by the demons you have marked as owned"
          (click)="cycleHave(state)">
          {{ haveLabel(state.have) }}
        </button>

        @if (hasResMods()) {
          <button type="button" [class.on]="showResMods()"
            title="Show the actual damage multipliers instead of the wk/rs/nu codes"
            (click)="resModsToggled.emit()">Multipliers</button>
        }
        @if (hasAilments()) {
          <button type="button" [class.on]="showAilments()"
            title="Show ailment resistance columns"
            (click)="ailmentsToggled.emit()">Ailments</button>
        }

        <span class="spacer"></span>
        <button type="button" [class.on]="comparing()" title="Compare demons side by side"
          (click)="compareToggled.emit()">Compare</button>
        <button type="button" [class.on]="showingFusable()"
          title="What the demons you have starred can fuse into"
          (click)="fusableToggled.emit()">Can fuse now</button>
        <button type="button" [class.on]="showingPlans()"
          title="The fusion recipes you bookmarked"
          (click)="plansToggled.emit()">My plans</button>
        <button type="button" title="Back to the default row order" (click)="sortReset.emit()">
          Reset sort
        </button>
        <button type="button" [disabled]="!query()" (click)="clearAll()">
          Clear filters
        </button>
      </div>

      @if (resistHeaders().length) {
        <div class="filter-row">
          <span class="filter-label tip"
            data-tip="Click an element to cycle through: weak &#8594; resist &#8594; null &#8594; repel &#8594; drain">Affinity</span>
          @for (elem of resistHeaders(); track elem) {
            <button type="button"
              [ngClass]="['elem-toggle', state.elements[elem] || 'off']"
              [title]="elemTitle(elem, state)"
              (click)="cycleElement(elem, state)">
              <div class="element-icon {{ elem }}"></div>
              <span class="state">{{ state.elements[elem] || '' }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .filter-panel {
      display: flex;
      flex-direction: column;
      gap: 0.35em;
      font-weight: normal;
      text-align: left;
    }
    .filter-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35em;
    }
    .filter-label {
      color: #aaaaaa;
      font-size: 0.9em;
      padding-right: 0.2em;
    }
    .dash { color: #aaaaaa; }
    .spacer { flex: 1 1 auto; }
    input.lvl {
      width: 4.5em;
      padding: 0.2em 0.3em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
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
    .elem-toggle {
      display: flex;
      align-items: center;
      gap: 0.25em;
      padding: 0.15em 0.35em;
    }
    .elem-toggle .element-icon {
      flex: 0 0 20px;
      width: 20px;
      height: 20px;
    }
    .elem-toggle .state {
      min-width: 1.6em;
      font-size: 0.85em;
      text-align: center;
    }
    .elem-toggle.off { opacity: 0.45; }
    .elem-toggle.off .state { color: transparent; }
    /* Same colours the resistance columns use, so the panel reads the same. */
    .elem-toggle.wk { border-color: red; }
    .elem-toggle.wk .state { color: red; }
    .elem-toggle.rs { border-color: lightseagreen; }
    .elem-toggle.rs .state { color: lightseagreen; }
    .elem-toggle.nu { border-color: lightgray; }
    .elem-toggle.nu .state { color: lightgray; }
    .elem-toggle.rp { border-color: cyan; }
    .elem-toggle.rp .state { color: cyan; }
    .elem-toggle.ab { border-color: lime; }
    .elem-toggle.ab .state { color: lime; }
    button.on { border-color: #66BBFF; color: #66BBFF; }
    .have-toggle.yes { border-color: gold; color: gold; }
    .have-toggle.no { border-color: #888888; color: #bbbbbb; }
    /* Same tooltip as the recipe generator: its own box rather than the
       browser's, and no permanent line of hint text taking up room. */
    .tip { position: relative; cursor: help; text-decoration: underline dotted; }
    .tip::after {
      content: attr(data-tip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      z-index: 50;
      width: max-content;
      max-width: 24em;
      padding: 0.45em 0.65em;
      background-color: rgba(0, 0, 0, 0.88);
      color: white;
      border: solid 1px #555555;
      border-radius: 4px;
      font-size: 0.85em;
      line-height: 1.35;
      white-space: normal;
      text-align: left;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.12s ease;
    }
    .tip:hover::after { opacity: 1; visibility: visible; }
  `]
})
export class DemonFilterPanelComponent {
  query = input('');
  resistHeaders = input<string[]>([]);
  races = input<string[]>([]);
  lang = input('en');
  comparing = input(false);
  showingFusable = input(false);
  showingPlans = input(false);
  showAilments = input(false);
  showResMods = input(false);
  hasAilments = input(false);
  hasResMods = input(false);
  queryChanged = output<string>();
  sortReset = output<void>();
  compareToggled = output<void>();
  fusableToggled = output<void>();
  plansToggled = output<void>();
  ailmentsToggled = output<void>();
  resModsToggled = output<void>();

  private playerState = inject(PlayerStateService);

  state$ = computed(() => readPanelState(this.query(), this.resistHeaders(), this.races()));
  playerLvl$ = this.playerState.lvl$;

  setPlayerLvl(lvl: string) {
    this.playerState.setLvl(parseInt(lvl, 10));
  }

  haveLabel(have: string): string {
    return have ? `Owned: ${have}` : 'Owned: any';
  }

  cycleHave(state: PanelState) {
    const index = HAVE_STATES.indexOf(state.have);
    const have = index === HAVE_STATES.length - 1 ? '' : HAVE_STATES[index + 1];

    this.emit(Object.assign({}, state, { have }));
  }

  elemTitle(elem: string, state: PanelState): string {
    const label = translateElementLabel(elem, this.lang());
    const code = state.elements[elem];
    return code ? `${label}: ${STATE_LABELS[code]}` : label;
  }

  cycleElement(elem: string, state: PanelState) {
    const current = state.elements[elem] || '';
    const index = RESIST_STATES.indexOf(current);
    const next = index === RESIST_STATES.length - 1 ? '' : RESIST_STATES[index + 1];

    this.emit(Object.assign({}, state, {
      elements: Object.assign({}, state.elements, { [elem]: next })
    }));
  }

  setLvl(lvlMin: string, lvlMax: string) {
    this.emit(Object.assign({}, this.state$(), { lvlMin, lvlMax }));
  }

  setRace(race: string) {
    this.emit(Object.assign({}, this.state$(), { race }));
  }

  clearAll() {
    this.queryChanged.emit('');
  }

  private emit(state: PanelState) {
    this.queryChanged.emit(writePanelState(state));
  }
}
