import { Component, Input, OnInit, effect, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PositionEdgesService } from '../../shared/position-edges.service';
import { PositionStickyDirective } from '../../shared/position-sticky.directive';
import { ColumnWidthsDirective } from '../../shared/column-widths.directive';

import { SortedTableHeaderComponent, SortedTableComponent } from '../../shared/sorted-table.component';
import { SearchBarComponent, SearchHint } from '../../shared/search/search-bar.component';
import { OwnedStarComponent } from './owned-star.component';
import { RecipeFilterPanelComponent } from './recipe-filter-panel.component';
import { SearchStateService } from '../../shared/search/search-state.service';
import { parseQuery } from '../../shared/search/query-parser';
import { compileFusionFilter, FUSION_FILTER_HINTS } from '../models/fusion-filter';
import { displayLvl } from '../models/demon-filter';
import { PlayerStateService, SavedRecipe } from '../../shared/player/player-state.service';
import { FUSION_DATA_SERVICE } from '../constants';
import { FusionPair } from '../models';
import { LvlToNumberPipe, TranslateCompPipe } from '../pipes';
import Translations from '../data/translations.json';

@Component({
  selector: 'tr.app-fusion-pair-table-row',
  imports: [CommonModule, RouterModule, LvlToNumberPipe, OwnedStarComponent],
  template: `
    @if (recipeFor) {
      <td class="plan-cell">
        <button type="button"
          [ngClass]="['plan-btn', planned() ? 'on' : '']"
          [title]="planned() ? 'Forget this plan' : 'Save this recipe to my plans'"
          (click)="togglePlan()">&#9873;</button>
      </td>
    }
    <td class="price">{{ inGameCurrencySymbol+(data.price | number:'1.0-0') }}</td>
    <td>{{ data.race1 }}</td>
    <td>{{ data.lvl1 | lvlToNumber }}</td>
    <td>
      <app-owned-star [name]="data.name1"></app-owned-star>
      <a routerLink="{{ leftBaseUrl }}/{{ data.name1 }}">{{ data.name1 }}</a>
    </td>
    <td>{{ data.race2 }}</td>
    <td>{{ data.lvl2 | lvlToNumber }}</td>
    <td>
      <app-owned-star [name]="data.name2"></app-owned-star>
      <a routerLink="{{ rightBaseUrl }}/{{ data.name2 }}">{{ data.name2 }}</a>
    </td>
    @if (getNotes) { <td>{{ getNotes(data) }}</td> }
  `,
  styles: [`
    :host(.over-lvl) td { opacity: 0.4; }
    td.plan-cell { width: 2em; text-align: center; }
    .plan-btn {
      padding: 0 0.2em;
      color: #555555;
      background: none;
      border: 0;
      cursor: pointer;
      font-size: 1.05em;
    }
    .plan-btn.on { color: #66BBFF; }
    .plan-btn:hover { color: yellow; }
  `]
})
export class FusionPairTableRowComponent {
  private playerState = inject(PlayerStateService);

  @Input() recipeFor: (data: FusionPair) => SavedRecipe = null;
  @Input() data: FusionPair;

  planned(): boolean {
    return this.playerState.hasRecipe(this.recipeFor(this.data));
  }

  togglePlan() {
    this.playerState.toggleRecipe(this.recipeFor(this.data));
  }
  @Input() leftBaseUrl: string;
  @Input() rightBaseUrl: string;
  @Input() inGameCurrencySymbol: string;
  @Input() getNotes: (data: FusionPair) => string;
}

@Component({
  selector: 'tfoot.app-fusion-pair-table-header',
  imports: [CommonModule, RouterModule, SearchBarComponent, RecipeFilterPanelComponent, TranslateCompPipe],
  template: `
    <tr>
      <th [attr.colspan]="recipeFor ? 9 : 8" class="title">{{ title }}</th>
    </tr>
    <tr>
      <th [attr.colspan]="recipeFor ? 9 : 8" class="search-cell">
        <app-search-bar
          [query]="searchQuery"
          [hotkey]="isSticky"
          [hints]="searchHints"
          [matchCount]="matchCount"
          [totalCount]="totalCount"
          [unknownTerms]="unknownTerms"
          [placeholder]="searchPlaceholder"
          saveContext="recipes"
          (queryChanged)="searchQueryChanged.emit($event)">
        </app-search-bar>
        @if (isSticky) {
          <app-recipe-filter-panel
            [query]="searchQuery"
            [inheritElems]="inheritElems"
            [lang]="lang"
            (queryChanged)="searchQueryChanged.emit($event)"
            (cleared)="searchQueryChanged.emit('')"
            (sortReset)="sortResetRequested.emit()">
          </app-recipe-filter-panel>
        }
        @if (playerLvl) {
          <div class="reach-row">
            <button type="button"
              [ngClass]="['reach-btn', onlyReachable ? 'on' : '']"
              [title]="'Hide recipes needing an ingredient above level ' + playerLvl"
              (click)="reachToggled.emit()">
              Only what I can fuse at Lvl {{ playerLvl }}
            </button>
            <button type="button"
              [ngClass]="['reach-btn', bestFirst ? 'on' : '']"
              title="Put the recipes you can make now first, cheapest of those at the top"
              (click)="bestFirstToggled.emit()">
              Cheapest I can make
            </button>
            @if (onlyReachable) {
              <span class="reach-note">{{ hiddenByReach }} hidden</span>
            }
          </div>
        }
      </th>
    </tr>
    <tr>
      @if (recipeFor) { <th rowspan="2" [style.width.%]="4"></th> }
      <th rowspan="2" [style.width.%]="10" [ngClass]="[ 'sortable', sortDirClass(1) ]" (click)="nextSortFunIndex(1)">{{ msgs.Price | translateComp:lang }}</th>
      <th colspan="3" [style.width.%]="35">{{ leftHeader }}</th>
      <th colspan="3" [style.width.%]="35">{{ rightHeader }}</th>
      @if (getNotes) { <th rowspan="2" [style.width.%]="20">Notes</th> }
    </tr>
    <tr>
      <th [ngClass]="[ 'sortable', sortDirClass(2) ]" (click)="nextSortFunIndex(2)">{{ msgs.Race | translateComp:lang }}</th>
      <th [ngClass]="[ 'sortable', sortDirClass(3) ]" (click)="nextSortFunIndex(3)">Lvl</th>
      <th [ngClass]="[ 'sortable', sortDirClass(4) ]" (click)="nextSortFunIndex(4)">{{ msgs.Name | translateComp:lang }}</th>
      <th [ngClass]="[ 'sortable', sortDirClass(5) ]" (click)="nextSortFunIndex(5)">{{ msgs.Race | translateComp:lang }}</th>
      <th [ngClass]="[ 'sortable', sortDirClass(6) ]" (click)="nextSortFunIndex(6)">Lvl</th>
      <th [ngClass]="[ 'sortable', sortDirClass(7) ]" (click)="nextSortFunIndex(7)">{{ msgs.Name | translateComp:lang }}</th>
    </tr>
  `,
  styles: [`
    th.search-cell { padding: 0.35em 0.5em; font-weight: normal; }
    .reach-row { display: flex; align-items: center; gap: 0.5em; padding-top: 0.35em; }
    .reach-btn {
      padding: 0.2em 0.5em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
      font: inherit;
    }
    .reach-btn:hover { color: yellow; }
    .reach-btn.on { border-color: #66BBFF; color: #66BBFF; }
    .reach-note { color: #aaaaaa; font-size: 0.85em; }
  `]
})
export class FusionPairTableHeaderComponent extends SortedTableHeaderComponent {
  @Input() recipeFor: (data: FusionPair) => SavedRecipe = null;
  @Input() title: string;
  @Input() leftHeader: string;
  @Input() rightHeader: string;
  @Input() getNotes: (data: FusionPair) => string;
  @Input() lang = 'en';
  @Input() isSticky = false;
  @Input() searchQuery = '';
  @Input() searchHints: SearchHint[] = [];
  @Input() searchPlaceholder = '';
  @Input() matchCount = 0;
  @Input() totalCount = 0;
  @Input() unknownTerms: string[] = [];
  @Input() playerLvl = 0;
  @Input() inheritElems: string[] = [];
  @Input() onlyReachable = false;
  @Input() hiddenByReach = 0;
  @Input() bestFirst = false;
  searchQueryChanged = output<string>();
  reachToggled = output<void>();
  bestFirstToggled = output<void>();
  sortResetRequested = output<void>();
  msgs = Translations.FusionPairTableComponent;
}

@Component({
  selector: 'app-fusion-pair-table',
  imports: [
    CommonModule,
    ColumnWidthsDirective, PositionStickyDirective,
    FusionPairTableHeaderComponent, FusionPairTableRowComponent,
    TranslateCompPipe
  ],
  providers: [PositionEdgesService],
  template: `
    <div>
      <table appPositionSticky class="list-table">
        <tfoot #stickyHeader appColumnWidths
          class="app-fusion-pair-table-header sticky-header"
          [lang]="lang"
          [title]="title"
          [getNotes]="getNotes"
          [leftHeader]="leftHeader"
          [rightHeader]="rightHeader"
          [recipeFor]="recipeFor"
          [isSticky]="true"
          [searchQuery]="searchQuery"
          [searchHints]="searchHints"
          [searchPlaceholder]="searchPlaceholder"
          [matchCount]="visibleRows.length"
          [totalCount]="rowData.length"
          [unknownTerms]="unknownTerms"
          [playerLvl]="playerLvl()"
          [inheritElems]="inheritElems"
          [onlyReachable]="onlyReachable"
          [bestFirst]="bestFirst"
          [hiddenByReach]="hiddenByReach"
          [sortFunIndex]="sortFunIndex"
          (sortFunIndexChanged)="sortFunIndex = $event"
          (searchQueryChanged)="nextSearchQuery($event)"
          (reachToggled)="toggleOnlyReachable()"
          (bestFirstToggled)="toggleBestFirst()"
          (sortResetRequested)="resetSort()">
        </tfoot>
      </table>
      <table class="list-table">
        <tfoot #hiddenHeader appColumnWidths
          class="app-fusion-pair-table-header"
          [lang]="lang"
          [title]="title"
          [getNotes]="getNotes"
          [leftHeader]="leftHeader"
          [rightHeader]="rightHeader"
          [recipeFor]="recipeFor"
          [searchQuery]="searchQuery"
          [style.visibility]="'collapse'">
        </tfoot>
        <tbody>
          @if (!visibleRows.length) {
            <tr>
              <td [attr.colspan]="recipeFor ? 9 : 8">{{ msgs.NoFusionsFound | translateComp:lang }}</td>
            </tr>
          }
          @for (data of visibleRows.slice(0, currRow); track data) {
            <tr
              class="app-fusion-pair-table-row"
              [ngClass]="[data.notes || '', outOfReach(data) ? 'over-lvl' : '']"
              [recipeFor]="recipeFor"
              [data]="data"
              [getNotes]="getNotes"
              [leftBaseUrl]="leftBaseUrl"
              [rightBaseUrl]="rightBaseUrl"
              [inGameCurrencySymbol]="inGameCurrencySymbol">
            </tr>
          }
          @if (currRow < visibleRows.length) {
            <tr>
              <th class="nav" [attr.colspan]="recipeFor ? 9 : 8"
                [style.height.em]="2"
                (click)="currRow = currRow + incrRow">
                Show next {{ incrRow }} out of {{ visibleRows.length - currRow }}
              </th>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class FusionPairTableComponent extends SortedTableComponent<FusionPair> implements OnInit {
  private _title = 'Ingredient 1 x Ingredient 2 = Result';

  @Input() raceOrder: { [race: string]: number };
  @Input() leftHeader = 'Ingredient 1';
  @Input() rightHeader = 'Ingredient 2';
  @Input() leftBaseUrl = '../..';
  @Input() rightBaseUrl = '../..';
  @Input() initRow = 500;
  @Input() incrRow = 500;
  @Input() getNotes: (pair: FusionPair) => string = null;
  @Input() recipeFor: (pair: FusionPair) => SavedRecipe = null;
  @Input() lang = 'en';
  @Input() inGameCurrencySymbol: string;
  msgs = Translations.FusionPairTableComponent;

  sortFuns: ((f1: FusionPair, f2: FusionPair) => number)[] = [];
  currRow = this.initRow;

  private searchState = inject(SearchStateService);
  private route = inject(ActivatedRoute);
  private playerState = inject(PlayerStateService);
  private fusionData = inject(FUSION_DATA_SERVICE, { optional: true });

  searchQuery = '';
  searchHints: SearchHint[] = FUSION_FILTER_HINTS;
  searchPlaceholder = 'ingredient, race, lvl:<=40, price:<5000';
  unknownTerms: string[] = [];
  visibleRows: FusionPair[] = [];
  onlyReachable = false;
  bestFirst = false;
  hiddenByReach = 0;
  inheritElems: string[] = [];
  playerLvl = this.playerState.lvl$;

  @Input() set title(title: string) {
    this._title = title;
    this.currRow = this.initRow;
  }

  get title(): string {
    return this._title;
  }

  constructor() {
    super();
    // Changing your level changes which recipes are within reach.
    effect(() => { this.playerState.lvl$(); this.refilter(); });
  }

  ngOnInit() {
    this.nextInheritElems();
    this.searchQuery = this.searchState.read(this.route, 'recipes', 'fq');
    this.nextSortFuns();
    this.refilter();
  }

  override sort() {
    super.sort();
    this.refilter();
  }

  nextSearchQuery(query: string) {
    this.searchQuery = query;
    this.searchState.write(this.route, 'recipes', 'fq', query);
    this.currRow = this.initRow;
    this.refilter();
  }

  // Dimmed means "you cannot make this yet at the level you told us you are".
  outOfReach(pair: FusionPair): boolean {
    const lvl = this.playerState.lvl$();
    return !!lvl && Math.max(displayLvl(pair.lvl1), displayLvl(pair.lvl2)) > lvl;
  }

  // The elements the inherit: filter can offer, taken from the game's skills.
  private nextInheritElems() {
    const compendium = this.fusionData ? this.fusionData.compendium$() : null;

    if (!compendium) { return; }

    const seen: { [elem: string]: boolean } = {};

    for (const skill of compendium.allSkills) {
      if (skill.element) { seen[skill.element] = true; }
    }

    this.inheritElems = Object.keys(seen);
  }

  toggleOnlyReachable() {
    this.onlyReachable = !this.onlyReachable;
    this.currRow = this.initRow;
    this.refilter();
  }

  toggleBestFirst() {
    this.bestFirst = !this.bestFirst;
    this.sortFunIndex = this.bestFirst ? this.bestFirstIndex : 0;
  }

  resetSort() {
    this.bestFirst = false;
    this.sortFunIndex = 0;
  }

  private refilter() {
    const compendium = this.fusionData ? this.fusionData.compendium$() : null;
    const query = parseQuery(this.searchQuery);
    const filter = compileFusionFilter(query, {
      owned: this.playerState.owned$(),
      getDemon: compendium ? name => compendium.getDemon(name) : undefined,
      getSkill: compendium ? name => compendium.getSkill(name) : undefined
    });

    this.unknownTerms = filter.unknownTerms;

    const matched = filter.unknownTerms.length < query.terms.length
      ? this.rowData.filter(filter.predicate)
      : this.rowData;

    // The level filter is a separate switch so it survives whatever is typed.
    const reachable = this.onlyReachable && this.playerState.lvl$()
      ? matched.filter(pair => !this.outOfReach(pair))
      : matched;

    this.hiddenByReach = matched.length - reachable.length;
    this.visibleRows = reachable;
  }

  // Reachable recipes first, cheapest of those at the top. Lives at the end of
  // the list so the column header indices are untouched.
  private get bestFirstIndex(): number {
    return this.sortFuns.length - 1;
  }

  nextSortFuns() {
    this.sortFuns = [];

    if (this.raceOrder) {
      this.sortFuns.push(
        (f1, f2) => f1.price - f2.price,
        (f1, f2) => f1.price - f2.price,
        (f1, f2) => (this.raceOrder[f1.race1] - this.raceOrder[f2.race1]) * 200 + f2.lvl1 - f1.lvl1,
        (f1, f2) => f1.lvl1 - f2.lvl1,
        (f1, f2) => f1.name1.localeCompare(f2.name1),
        (f1, f2) => (this.raceOrder[f1.race2] - this.raceOrder[f2.race2]) * 200 + f2.lvl2 - f1.lvl2,
        (f1, f2) => f1.lvl2 - f2.lvl2,
        (f1, f2) => f1.name2.localeCompare(f2.name2),
        (f1, f2) => (this.outOfReach(f1) ? 1 : 0) - (this.outOfReach(f2) ? 1 : 0) ||
          f1.price - f2.price
      );

      this.sort();
    }
  }

  getSortFun(sortFunIndex: number): (a: FusionPair, b: FusionPair) => number {
    return this.sortFuns[sortFunIndex];
  }
}
