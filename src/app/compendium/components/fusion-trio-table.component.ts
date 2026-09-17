import { Component, ChangeDetectorRef, Input, output, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PositionEdgesService } from '../../shared/position-edges.service';
import { SearchBarComponent } from '../../shared/search/search-bar.component';
import { matchesQueryText, parseQuery } from '../../shared/search/query-parser';
import { SortedTableComponent, SortedTableHeaderComponent } from '../../shared/sorted-table.component';
import { FusionTrio } from '../models';
import { ColumnWidthsDirective } from '../../shared/column-widths.directive';
import { PositionStickyDirective } from '../../shared/position-sticky.directive';

export function trioText(trio: FusionTrio): string {
  const parts = [trio.demon?.name, trio.demon?.race];

  for (const fusion of trio.fusions || []) {
    parts.push(fusion.d1?.name, fusion.d1?.race, fusion.d2?.name, fusion.d2?.race,
      fusion.d3?.name, fusion.d3?.race);
  }

  return parts.filter(part => part).join(' ');
}

@Component({
  selector: 'tbody.app-fusion-trio-table-row',
  imports: [CommonModule, RouterModule],
  template: `
    @if (!showing) {
      <tr>
        <th class="nav"
          [style.height.em]="1"
          (click)="toggleShowing.emit(showIndex)">
          Show
        </th>
        <td>{{ inGameCurrencySymbol +( trio.minPrice | number:'1.0-0' ) }}</td>
        <td>{{ trio.demon.race }}</td>
        <td>{{ trio.demon.currLvl }}</td>
        <td><a routerLink="{{ baseUrl }}/{{ trio.demon.name }}">{{ trio.demon.name }}</a></td>
        <td colspan="7" [style.color]="'#666'">{{ trio.fusions.length }} recipes hidden</td>
      </tr>
    }
    @if (showing) {
      <tr>
        <th class="nav active"
          [style.height.em]="1"
          [attr.rowspan]="trio.fusions.length + 1"
          (click)="toggleShowing.emit(showIndex)">
          Hide
        </th>
      </tr>
      @for (recipe of trio.fusions; track recipe) {
        <tr>
          <td>{{ inGameCurrencySymbol + ( recipe.price | number:'1.0-0' ) }}</td>
          <td>{{ trio.demon.race }}</td>
          <td>{{ trio.demon.currLvl }}</td>
          <td><a routerLink="{{ baseUrl }}/{{ trio.demon.name }}">{{ trio.demon.name }}</a></td>
          @for (demon of [ recipe.d1, recipe.d2, recipe.d3 ]; track demon) {
            @if (trio.demon !== demon) {
              <td>{{ demon.race }}</td>
              <td>{{ demon.currLvl }}</td>
              <td><a routerLink="{{ baseUrl }}/{{ demon.name }}">{{ demon.name }}</a></td>
            }
          }
          @if (getNotes) { <td>{{ getNotes(recipe.d1.name, recipe.d2.name, recipe.d3.name) }}</td> }
        </tr>
      }
    }
  `
})
export class FusionTrioTableRowComponent {
  @Input() trio: FusionTrio;
  @Input() showing: boolean;
  @Input() showIndex: number;
  @Input() baseUrl = '../../..';
  @Input() inGameCurrencySymbol: string;
  @Input() getNotes: (demon1: string, demon2: string, demon3: string) => string;
  toggleShowing = output<number>();
}

@Component({
  selector: 'tfoot.app-fusion-trio-table-header',
  imports: [CommonModule, SearchBarComponent],
  template: `
    <tr>
      <th colspan="12" class="title">{{ title }}</th>
    </tr>
    <tr>
      <th colspan="12" class="search-cell">
        <app-search-bar
          [query]="searchQuery"
          [hotkey]="isSticky"
          [matchCount]="matchCount"
          [totalCount]="totalCount"
          saveContext="recipes"
          placeholder="ingredient or race"
          (queryChanged)="searchQueryChanged.emit($event)">
        </app-search-bar>
        <div class="sort-row">
          <button type="button" class="sort-btn" title="Back to the default row order"
            (click)="sortResetRequested.emit()">Reset sort</button>
        </div>
      </th>
    </tr>
    <tr>
      <th class="sortable" rowspan="2" [style.width.%]="10" (click)="toggleHideAll()">Hide All</th>
      <th rowSpan="2" [style.width.%]="10" [ngClass]="[ 'sortable', sortDirClass(1) ]" (click)="nextSortFunIndex(1)">Price</th>
      <th colspan="3" [style.width.%]="20">{{ leftHeader }}</th>
      <th colspan="3" [style.width.%]="20">Ingredient 2</th>
      <th colspan="3" [style.width.%]="20">Ingredient 3</th>
      @if (getNotes) { <th rowspan="2" [style.width.%]="20">Notes</th> }
    </tr>
    <tr>
      <th [ngClass]="[ 'sortable', sortDirClass(2) ]" (click)="nextSortFunIndex(2)">Race</th>
      <th [ngClass]="[ 'sortable', sortDirClass(3) ]" (click)="nextSortFunIndex(3)">Lvl<span>--</span></th>
      <th [ngClass]="[ 'sortable', sortDirClass(4) ]" (click)="nextSortFunIndex(4)">Name</th>
      <th>Race</th>
      <th>Lvl</th>
      <th>Name</th>
      <th>Race</th>
      <th>Lvl</th>
      <th>Name</th>
    </tr>
  `,
  styles: [`
    span {
      color: transparent;
    }
    th.search-cell { padding: 0.35em 0.5em; font-weight: normal; }
    th.search-cell span { color: inherit; }
    .sort-row { display: flex; padding-top: 0.35em; }
    .sort-btn {
      padding: 0.2em 0.5em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
      font: inherit;
    }
    .sort-btn:hover { color: yellow; }
  `]
})
export class FusionTrioTableHeaderComponent extends SortedTableHeaderComponent {
  @Input() searchQuery = '';
  @Input() matchCount = 0;
  @Input() totalCount = 0;
  @Input() isSticky = false;
  searchQueryChanged = output<string>();
  sortResetRequested = output<void>();
  @Input() title: string;
  @Input() leftHeader: string;
  @Input() getNotes: (demon1: string, demon2: string, demon3: string) => string;
  hideAll = output<boolean>();

  toggleHideAll() {
    this.hideAll.emit(true);
  }
}

@Component({
  selector: 'app-fusion-trio-table',
  imports: [
    CommonModule,
    ColumnWidthsDirective, PositionStickyDirective,
    FusionTrioTableHeaderComponent, FusionTrioTableRowComponent
  ],
  providers: [PositionEdgesService],
  template: `
    <div>
      <table appPositionSticky class="list-table">
        <tfoot #stickyHeader appColumnWidths
          class="app-fusion-trio-table-header"
          [title]="title"
          [getNotes]="getNotes"
          [leftHeader]="leftHeader"
          [isSticky]="true"
          [searchQuery]="searchQuery"
          [matchCount]="visibleRows.length"
          [totalCount]="rowData.length"
          [sortFunIndex]="sortFunIndex"
          (hideAll)="toggleHideAll()"
          (searchQueryChanged)="nextSearchQuery($event)"
          (sortResetRequested)="resetSort()"
          (sortFunIndexChanged)="sortFunIndex = $event">
        </tfoot>
      </table>
      <table class="list-table">
        <tfoot #hiddenHeader appColumnWidths
          class="app-fusion-trio-table-header"
          [title]="title"
          [getNotes]="getNotes"
          [leftHeader]="leftHeader"
          [style.visibility]="'collapse'">
        </tfoot>
        @if (!visibleRows.length) {
          <tbody>
            <tr><td colspan="12">No fusions found!</td></tr>
          </tbody>
        }
        @for (data of visibleRows; track data; let i = $index) {
          <tbody
            class="app-fusion-trio-table-row"
            [trio]="data"
            [getNotes]="getNotes"
            [showing]="showing[i]"
            [showIndex]="i"
            [inGameCurrencySymbol]="inGameCurrencySymbol"
            (toggleShowing)="toggleShowing($event)">
          </tbody>
        }
      </table>
    </div>
  `
})
export class FusionTrioTableComponent extends SortedTableComponent<FusionTrio> implements OnInit, AfterViewChecked {
  @Input() title = 'Fusion Trio Table';
  @Input() leftHeader = 'Ingredient 1';
  @Input() raceOrder: { [race: string]: number };
  @Input() inGameCurrencySymbol: string;
  @Input() getNotes: (demon1: string, demon2: string, demon3: string) => string;
  showing: boolean[] = [];
  searchQuery = '';
  visibleRows: FusionTrio[] = [];

  nextSearchQuery(query: string) {
    this.searchQuery = query;
    this.refilter();
  }

  resetSort() {
    this.sortFunIndex = 0;
  }

  override sort() {
    super.sort();
    this.refilter();
  }

  // A trio matches when every word typed is found in the demon it makes or in
  // any of the three ingredients.
  private refilter() {
    const parsed = parseQuery(this.searchQuery);

    this.visibleRows = parsed.isEmpty
      ? this.rowData
      : this.rowData.filter(trio => matchesQueryText(parsed, trioText(trio)));
  }

  protected sortFuns: ((a: FusionTrio, b: FusionTrio) => number)[] = [];

  constructor(private changeDetector: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    this.nextSortFuns();
  }

  ngAfterViewChecked() {
    this.matchColWidths();
  }

  toggleShowing(hideIndex: number) {
    this.showing[hideIndex] = !this.showing[hideIndex];
  }

  toggleHideAll() {
    for (let i = 0; i < this.showing.length; i++) {
      this.showing[i] = false;
    }
  }

  nextSortFuns() {
    this.sortFuns = [];

    if (this.raceOrder) {
      this.sortFuns.push(
        (a, b) => a.minPrice - b.minPrice,
        (a, b) => a.minPrice - b.minPrice,
        (a, b) => (this.raceOrder[a.demon.race] - this.raceOrder[b.demon.race]) * 200 + a.demon.currLvl - b.demon.currLvl,
        (a, b) => a.demon.currLvl - b.demon.currLvl,
        (a, b) => a.demon.name.localeCompare(b.demon.name)
      );

      this.sort();
    }
  }

  getSortFun(sortFunIndex: number): (a: FusionTrio, b: FusionTrio) => number {
    return this.sortFuns[sortFunIndex];
  }
}
