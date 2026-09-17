import { Component, Input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SortedTableHeaderComponent } from '../../shared/sorted-table.component';
import { SearchBarComponent, SearchHint } from '../../shared/search/search-bar.component';
import { DemonFilterPanelComponent } from './demon-filter-panel.component';
import { TranslateCompPipe, TranslateElementLabelPipe } from '../pipes';
import Translations from '../data/translations.json';

@Component({
  selector: 'tfoot.app-demon-list-header',
  imports: [CommonModule, SearchBarComponent, DemonFilterPanelComponent, TranslateCompPipe, TranslateElementLabelPipe],
  template: `
    <tr>
      <th class="search-cell" [attr.colSpan]="totalCols">
        <app-search-bar
          [query]="searchQuery"
          [hotkey]="isSticky"
          [hints]="searchHints"
          [matchCount]="matchCount"
          [totalCount]="totalCount"
          [unknownTerms]="unknownTerms"
          [placeholder]="searchPlaceholder"
          [saveContext]="saveContext"
          (queryChanged)="searchQueryChanged.emit($event)">
        </app-search-bar>
      </th>
    </tr>
    @if (isSticky) {
      <tr>
        <th class="search-cell" [attr.colSpan]="totalCols">
          <app-demon-filter-panel
            [query]="searchQuery"
            [resistHeaders]="resistHeaders"
            [races]="races"
            [lang]="lang"
            [comparing]="comparing"
            [showingFusable]="showingFusable"
            [showingPlans]="showingPlans"
            [showAilments]="showAilments"
            [showResMods]="showResMods"
            [hasAilments]="hasAilments"
            [hasResMods]="hasResMods"
            (queryChanged)="searchQueryChanged.emit($event)"
            (sortReset)="sortResetRequested.emit()"
            (compareToggled)="compareToggleRequested.emit()"
            (fusableToggled)="fusableToggleRequested.emit()"
            (plansToggled)="plansToggleRequested.emit()"
            (ailmentsToggled)="ailmentsToggleRequested.emit()"
            (resModsToggled)="resModsToggleRequested.emit()">
          </app-demon-filter-panel>
        </th>
      </tr>
    }
    <tr>
      <th [attr.colSpan]="hasInherits ? 4 : 3">{{ (isPersona ? msgs.Persona : msgs.Demon) | translateComp:lang }}</th>
      @if (statColIndices.length) {
        <th [attr.colSpan]="statColIndices.length">{{ msgs.Stats | translateComp:lang }}</th>
      }
      @if (resistColIndices.length) {
        <th [attr.colSpan]="resistColIndices.length">{{ msgs.Resistances | translateComp:lang }}</th>
      }
      @if (showAilments && ailmentColIndices.length) {
        <th [attr.colSpan]="ailmentColIndices.length">{{ msgs.Ailment | translateComp:lang }}</th>
      }
      @if (affinityColIndices.length) {
        <th [attr.colSpan]="affinityColIndices.length">{{ msgs.Affinities | translateComp:lang }}</th>
      }
      @if (isEnemy) {
        <th colspan="2">Enemy</th>
      }
    </tr>
    <tr>
      <th class="sortable" [ngClass]="sortDirClass(1)" (click)="nextSortFunIndex(1)"><span>{{ msgs.Race | translateComp:lang }}</span></th>
      <th class="sortable" [ngClass]="sortDirClass(2)" (click)="nextSortFunIndex(2)"><span>Lvl</span></th>
      <th class="sortable" [ngClass]="sortDirClass(3)" (click)="nextSortFunIndex(3)"><span>{{ msgs.Name | translateComp:lang }}</span></th>
      @if (hasInherits) {
        <th class="sortable" [ngClass]="sortDirClass(4)" (click)="nextSortFunIndex(4)">Inherits</th>
      }
      @for (pair of statColIndices; track pair) {
        <th class="sortable" (click)="nextSortFunIndex(pair.index)">
          {{ pair.stat }}
        </th>
      }
      @for (pair of resistColIndices; track pair) {
        <th
          class="sortable"
          (click)="nextSortFunIndex(pair.index)">
          <div [title]="pair.elem | translateElementLabel:lang" class="element-icon {{ pair.elem }}"></div>
        </th>
      }
      @if (showAilments) {
        @for (pair of ailmentColIndices; track pair) {
          <th
            class="sortable"
            (click)="nextSortFunIndex(pair.index)">
            <div [title]="pair.elem | translateElementLabel:lang" class="ailment-icon {{ pair.elem }}"></div>
          </th>
        }
      }
      @for (pair of affinityColIndices; track pair) {
        <th
          class="sortable"
          (click)="nextSortFunIndex(pair.index)">
          <div [title]="pair.elem | translateElementLabel:lang" class="element-icon {{ pair.elem }}"></div>
        </th>
      }
      @if (isEnemy) {
        <th>Drops</th>
      }
      @if (isEnemy) {
        <th>Appears</th>
      }
    </tr>
  `,
  styles: [`
    th { white-space: nowrap; }
    th.search-cell { padding: 0.35em 0.5em; }
    span { padding-right: 0.6em; }
  `]
})
export class DemonListHeaderComponent extends SortedTableHeaderComponent implements OnInit {
  @Input() isEnemy = false;
  @Input() isPersona = false;
  @Input() hasInherits = false;
  @Input() isSticky = false;
  @Input() lang = 'en';
  @Input() statHeaders: string[] = [];
  @Input() resistHeaders: string[] = [];
  @Input() ailmentHeaders: string[] = [];
  @Input() affinityHeaders: string[] = [];
  @Input() showAilments = false;
  @Input() searchQuery = '';
  @Input() searchHints: SearchHint[] = [];
  @Input() searchPlaceholder = '';
  @Input() matchCount = 0;
  @Input() totalCount = 0;
  @Input() unknownTerms: string[] = [];
  @Input() races: string[] = [];
  @Input() saveContext = '';
  @Input() comparing = false;
  @Input() showingFusable = false;
  @Input() showingPlans = false;
  @Input() showResMods = false;
  @Input() hasAilments = false;
  @Input() hasResMods = false;
  searchQueryChanged = output<string>();
  sortResetRequested = output<void>();
  compareToggleRequested = output<void>();
  fusableToggleRequested = output<void>();
  plansToggleRequested = output<void>();
  ailmentsToggleRequested = output<void>();
  resModsToggleRequested = output<void>();
  statColIndices: { stat: string, index: number }[] = [];
  resistColIndices: { elem: string, index: number }[] = [];
  ailmentColIndices: { elem: string, index: number }[] = [];
  reslvlColIndices: { elem: string, index: number }[] = [];
  affinityColIndices: { elem: string, index: number }[] = [];
  // Worked out on demand: the ailment columns come and go after ngOnInit, and
  // a stale span leaves the search row narrower than the table.
  get totalCols(): number {
    return (this.hasInherits ? 4 : 3) + (this.isEnemy ? 2 : 0) +
      this.statColIndices.length + this.resistColIndices.length +
      (this.showAilments ? this.ailmentColIndices.length : 0) +
      this.affinityColIndices.length;
  }

  msgs = Translations.DemonListComponent;

  ngOnInit() {
    this.nextColIndices();
  }

  private nextColIndices() {
    let index = this.hasInherits ? 5 : 4;

    if (this.statHeaders) {
      this.statColIndices = this.statHeaders.map((stat, i) => ({ stat, index: i + index }));
      index += this.statHeaders.length;
    }

    if (this.resistHeaders) {
      this.resistColIndices = this.resistHeaders.map((elem, i) => ({ elem, index: i + index }));
      index += this.resistHeaders.length;
    }

    if (this.ailmentHeaders) {
      this.ailmentColIndices = this.ailmentHeaders.map((elem, i) => ({ elem, index: i + index }));
      index += this.ailmentHeaders.length;
    }

    if (this.affinityHeaders) {
      this.affinityColIndices = this.affinityHeaders.map((elem, i) => ({ elem, index: i + index }));
    }

  }
}
