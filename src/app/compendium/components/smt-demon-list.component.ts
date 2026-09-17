import { Component, Input, effect, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PositionEdgesService } from '../../shared/position-edges.service';
import { SearchStateService } from '../../shared/search/search-state.service';
import { PlayerStateService } from '../../shared/player/player-state.service';
import { FUSION_DATA_SERVICE } from '../constants';
import { SearchHint } from '../../shared/search/search-bar.component';
import { parseQuery } from '../../shared/search/query-parser';
import { compileDemonFilter, demonFilterHints, displayLvl } from '../models/demon-filter';
import { Demon } from '../models';
import { DemonListComponent } from '../bases/demon-list.component';
import {
  ElementAffinityToStringPipe, LvlToNumberPipe, ReslvlToColorPipe,
  ReslvlToStringLocalePipe, ResmodToStringPipe
} from '../pipes';
import { ColumnWidthsDirective } from '../../shared/column-widths.directive';
import { PositionStickyDirective } from '../../shared/position-sticky.directive';
import { DemonListHeaderComponent } from './demon-list-header.component';
import { DemonComparisonComponent } from './demon-comparison.component';
import { FusableNowComponent } from './fusable-now.component';
import { SavedRecipesComponent } from './saved-recipes.component';

@Component({
  selector: 'tr.app-smt-demon-list-row',
  imports: [
    CommonModule, RouterModule,
    ElementAffinityToStringPipe, LvlToNumberPipe, ReslvlToColorPipe,
    ReslvlToStringLocalePipe, ResmodToStringPipe
  ],
  template: `
    <td [ngClass]="['align', data.align ? data.align : 'none']">{{ data.race }}</td>
    @if (!hasCurrLvl) { <td>{{ data.lvl | lvlToNumber }}</td> }
    @if (hasCurrLvl) {
      <td style="text-align: center;">
        @if (!currOffset) {
          <button (click)="updateCurrRange()">{{ data.currLvl }} &#9998;</button>
        }
        @if (currOffset) {
          <select (change)="emitValidLvl($event)">
            <option [value]="data.currLvl">{{ data.currLvl }}</option>
            @for (_ of currRange; track _; let i = $index) {
              <option [value]="i + currOffset">{{ i + currOffset }}</option>
            }
          </select>
        }
      </td>
    }
    <td>
      @if (showOwned) {
        <button type="button"
          [ngClass]="['own-star', isOwned ? 'owned' : 'not-owned']"
          [title]="isOwned ? 'You have this one' : 'Mark as owned'"
          (click)="ownedToggled.emit(data.name)">&#9733;</button>
      }
      <a [routerLink]="data.name">{{ data.name }}</a>
    </td>
    @if (hasInherits) { <td><div [ngClass]="['element-icon', 'inherit-icon', 'i' + data.inherits]">{{ data.inherits }}</div></td> }
    @for (stat of data.stats; track stat) {
      <td>{{ stat }}</td>
    }
    @for (resist of data.resists; track $index) {
      <td [ngClass]="['resists', resist | reslvlToColor]">
        {{ showResMods ? (resist | resmodToString) : (resist | reslvlToStringLocale:lang) }}
      </td>
    }
    @if (showAilments) {
      @for (ailment of data.ailments; track $index) {
        <td [ngClass]="['resists', ailment | reslvlToColor]">
          {{ showResMods ? (ailment | resmodToString) : (ailment | reslvlToStringLocale:lang) }}
        </td>
      }
    }
    @if (hasAffinity) {
      @for (affinity of data.affinities; track affinity) {
        <td [ngClass]="'affinity' + affinity">{{ affinity | affinityToString }}</td>
      }
    }
    @if (isEnemy) { <td>{{ data.drop }}</td> }
    @if (isEnemy) { <td>{{ data.area }}</td> }
  `,
  styles: [`
    .own-star {
      padding: 0 0.3em;
      margin-right: 0.2em;
      background: none;
      border: 0;
      cursor: pointer;
      font-size: 1em;
    }
    :host(.over-lvl) td { opacity: 0.45; }
    .own-star.owned { color: gold; }
    .own-star.not-owned { color: #555555; }
    .own-star:hover { color: yellow; }
  `]
})
export class SmtDemonListRowComponent {
  @Input() showOwned = true;
  @Input() showAilments = false;
  @Input() showResMods = false;
  @Input() isOwned = false;
  ownedToggled = output<string>();
  @Input() isEnemy = false;
  @Input() hasCurrLvl = false;
  @Input() hasInherits = false;
  @Input() hasAffinity = false;
  @Input() lang = 'en';
  @Input() data: Demon;
  currLvl = output<number>();

  currOffset = 0;
  currRange = Array(0);

  updateCurrRange() {
    if (this.currOffset !== 0) { return; }
    this.currOffset = Math.floor(this.data.lvl);
    this.currRange = Array(100 - this.currOffset);
  }

  emitValidLvl(lvlEvent: Event) {
    const lvl = parseInt((<HTMLInputElement>lvlEvent.target).value, 10);

    if (this.data.currLvl !== lvl && 0 < lvl && lvl < 100 && Number.isInteger(lvl)) {
      this.data.currLvl = lvl;
      this.currLvl.emit(lvl);
    }
  }
}

@Component({
  selector: 'app-smt-demon-list',
  imports: [
    CommonModule,
    ColumnWidthsDirective, PositionStickyDirective,
    DemonListHeaderComponent, SmtDemonListRowComponent,
    DemonComparisonComponent, FusableNowComponent, SavedRecipesComponent 
  ],
  providers: [PositionEdgesService],
  template: `
    @if (showPlans) {
      <app-saved-recipes [lang]="lang"></app-saved-recipes>
    }
    @if (showFusable) {
      <app-fusable-now [lang]="lang"></app-fusable-now>
    }
    @if (showCompare) {
      <app-demon-comparison
        [demons]="rowData"
        [statHeaders]="statHeaders"
        [resistHeaders]="resistHeaders"
        [lang]="lang">
      </app-demon-comparison>
    }
    <table appPositionSticky class="list-table">
      <tfoot #stickyHeader appColumnWidths
        class="app-demon-list-header sticky-header"
        [isPersona]="isPersona"
        [isEnemy]="isEnemy"
        [isSticky]="true"
        [lang]="lang"
        [hasInherits]="!!inheritOrder"
        [statHeaders]="statHeaders"
        [resistHeaders]="resistHeaders"
        [ailmentHeaders]="ailmentHeaders"
        [showAilments]="showAilments"
        [affinityHeaders]="affinityHeaders"
        [searchQuery]="searchQuery"
        [searchHints]="searchHints"
        [searchPlaceholder]="searchPlaceholder"
        [matchCount]="matchCount"
        [totalCount]="rowData.length"
        [unknownTerms]="unknownTerms"
        [saveContext]="searchContext"
        [races]="races"
        [comparing]="showCompare"
        [showingFusable]="showFusable"
        [showingPlans]="showPlans"
        [showAilments]="showAilments"
        [showResMods]="showResMods"
        [hasAilments]="hasAilments"
        [hasResMods]="hasResMods"
        [sortFunIndex]="sortFunIndex"
        (sortFunIndexChanged)="sortFunIndex = $event"
        (searchQueryChanged)="nextSearchQuery($event)"
        (sortResetRequested)="resetSort()"
        (compareToggleRequested)="showCompare = !showCompare"
        (fusableToggleRequested)="showFusable = !showFusable"
        (plansToggleRequested)="showPlans = !showPlans"
        (ailmentsToggleRequested)="showAilments = !showAilments"
        (resModsToggleRequested)="showResMods = !showResMods">
      </tfoot>
    </table>
    <table class="list-table">
      <tfoot #hiddenHeader appColumnWidths
        class="app-demon-list-header"
        [isPersona]="isPersona"
        [isEnemy]="isEnemy"
        [lang]="lang"
        [hasInherits]="!!inheritOrder"
        [statHeaders]="statHeaders"
        [resistHeaders]="resistHeaders"
        [ailmentHeaders]="ailmentHeaders"
        [showAilments]="showAilments"
        [affinityHeaders]="affinityHeaders"
        [searchQuery]="searchQuery"
        [style.visibility]="'collapse'">
      </tfoot>
      <tbody>
        @for (data of rowData; track data) {
          <tr
            class="app-smt-demon-list-row"
            [showOwned]="showOwned"
            [isOwned]="playerState.isOwned(data.name)"
            [showAilments]="showAilments"
            [showResMods]="showResMods"
            (ownedToggled)="toggleOwned($event)"
            [isEnemy]="isEnemy"
            [hasCurrLvl]="hasCurrLvl"
            [hasInherits]="!!inheritOrder"
            [hasAffinity]="!!affinityHeaders"
            [lang]="lang"
            [ngClass]="{
              special: data.fusion === 'special',
              exception: data.fusion !== 'special' && data.fusion !== 'normal',
              hidden: filterActive && !visibleDemons.has(data),
              'over-lvl': outOfReach(data)
            }"
            [data]="data"
            (currLvl)="lvlChanged.emit({ demon: data.name, currLvl: $event })">
          </tr>
        }
      </tbody>
    </table>
  `
})
export class SmtDemonListComponent extends DemonListComponent<Demon> {
  @Input() isPersona = false;
  @Input() isEnemy = false;
  @Input() hasCurrLvl = false;
  @Input() lang = 'en';
  lvlChanged = output<{ demon: string, currLvl: number }>();

  private searchState = inject(SearchStateService);
  private route = inject(ActivatedRoute);
  playerState = inject(PlayerStateService);
  private fusionData = inject(FUSION_DATA_SERVICE, { optional: true });

  searchQuery = '';
  searchHints: SearchHint[] = [];
  searchPlaceholder = 'name, race, lvl:20-40, weak:fire, skill:agi';
  matchCount = 0;
  unknownTerms: string[] = [];
  filterActive = false;
  visibleDemons = new Set<Demon>();
  races: string[] = [];
  showCompare = false;
  showFusable = false;
  showPlans = false;
  showAilments = false;
  showResMods = false;
  hasAilments = false;
  hasResMods = false;

  constructor() {
    super();
    // A have: filter has to re-run when the owned set changes under it.
    effect(() => { this.playerState.owned$(); this.refilter(); });
  }

  // Keeping the star to the demon list proper: persona and enemy lists are not
  // collected the same way.
  get showOwned(): boolean {
    return !this.isPersona && !this.isEnemy;
  }

  get searchContext(): string {
    return this.isEnemy ? 'enemies' : 'demons';
  }

  toggleOwned(name: string) {
    this.playerState.toggleOwned(name);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.searchHints = demonFilterHints({ statHeaders: this.statHeaders });
    this.searchQuery = this.searchState.read(this.route, this.searchContext, 'q');
    this.refilter();
  }

  override sort() {
    super.sort();
    this.refilter();
  }

  nextSearchQuery(query: string) {
    this.searchQuery = query;
    this.searchState.write(this.route, this.searchContext, 'q', query);
    this.refilter();
  }

  resetSort() {
    this.sortFunIndex = 0;
  }

  // Dimmed means "above the level you told us you are", the same as recipes
  // you cannot make yet. Reading the signal here keeps the rows in step.
  outOfReach(demon: Demon): boolean {
    const mine = this.playerState.lvl$();
    return !!mine && displayLvl(demon.lvl) > mine;
  }

  // Only offer the toggles on games whose data actually carries them.
  private nextColumnFlags() {
    this.hasAilments = !!(this.ailmentHeaders || []).length &&
      this.rowData.some(demon => (demon.ailments || []).length > 0);

    this.hasResMods = this.rowData.some(demon =>
      (demon.resists || []).some(resist => (resist & 0x3FF) !== 0));

    if (!this.hasAilments) { this.showAilments = false; }
    if (!this.hasResMods) { this.showResMods = false; }
  }

  private nextRaces() {
    const present = new Set(this.rowData.map(demon => demon.race));
    const order = this.raceOrder || {};

    this.races = Object.keys(order)
      .filter(race => present.has(race))
      .sort((a, b) => order[a] - order[b]);
  }

  private refilter() {
    this.nextRaces();
    this.nextColumnFlags();
    const query = parseQuery(this.searchQuery);
    const compendium = this.fusionData ? this.fusionData.compendium$() : null;
    const filter = compileDemonFilter(query, {
      statHeaders: this.statHeaders,
      resistHeaders: this.resistHeaders,
      owned: this.playerState.owned$(),
      getSkill: compendium ? name => compendium.getSkill(name) : undefined
    });

    this.unknownTerms = filter.unknownTerms;
    this.filterActive = filter.unknownTerms.length < query.terms.length;
    this.visibleDemons = new Set(this.filterActive ? this.rowData.filter(filter.predicate) : []);
    this.matchCount = this.filterActive ? this.visibleDemons.size : this.rowData.length;
  }
}
