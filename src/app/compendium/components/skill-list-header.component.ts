import { Component, Input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SortedTableHeaderComponent } from '../../shared/sorted-table.component';
import { SearchBarComponent, SearchHint } from '../../shared/search/search-bar.component';
import { SkillFilterPanelComponent } from './skill-filter-panel.component';
import { TranslateCompPipe } from '../pipes';
import Translations from '../data/translations.json';

@Component({
  selector: 'tfoot.app-skill-list-header',
  imports: [CommonModule, SearchBarComponent, SkillFilterPanelComponent, TranslateCompPipe],
  template: `
    <tr>
      <th class="search-cell" [attr.colSpan]="skillHeaderLen + acquireHeaderLen">
        <app-search-bar
          [query]="searchQuery"
          [hotkey]="isSticky"
          [hints]="searchHints"
          [matchCount]="matchCount"
          [totalCount]="totalCount"
          [unknownTerms]="unknownTerms"
          [placeholder]="searchPlaceholder"
          saveContext="skills"
          (queryChanged)="searchQueryChanged.emit($event)">
        </app-search-bar>
        @if (isSticky) {
          <app-skill-filter-panel
            [query]="searchQuery"
            [elems]="filterElems"
            [targets]="filterTargets"
            [lang]="lang"
            (queryChanged)="searchQueryChanged.emit($event)"
            (cleared)="searchQueryChanged.emit('')"
            (sortReset)="sortResetRequested.emit()">
          </app-skill-filter-panel>
        }
      </th>
    </tr>
    <tr>
      <th [attr.colSpan]="skillHeaderLen">{{ msgs.Skill | translateComp:lang }}</th>
      <th [attr.colSpan]="acquireHeaderLen">{{ msgs.HowToAcquire | translateComp:lang }}</th>
    </tr>
    <tr>
      <th class="sortable" [ngClass]="sortDirClass(1)" (click)="nextSortFunIndex(1)"><span>{{ msgs.Elem | translateComp:lang }}</span></th>
      <th class="sortable" [ngClass]="sortDirClass(2)" (click)="nextSortFunIndex(2)"><span>{{ msgs.Name | translateComp:lang }}</span></th>
      <th class="sortable" [ngClass]="sortDirClass(3)" (click)="nextSortFunIndex(3)"><span class="cost">{{ msgs.Cost | translateComp:lang }}</span></th>
      <th>{{ msgs.Effect | translateComp:lang }}</th>
      @if (hasTarget)     { <th>{{ msgs.Target | translateComp:lang }}</th> }
      @if (hasRank)       { <th class="sortable" [ngClass]="sortDirClass(4)" (click)="nextSortFunIndex(4)"><span>{{ msgs.Rank | translateComp:lang }}</span></th> }
      @if (hasInherit)    { <th class="sortable" [ngClass]="sortDirClass(5)" (click)="nextSortFunIndex(5)"><span>Inherit</span></th> }
      <th>{{ msgs.LearnedBy | translateComp:lang }}</th>
      @if (transferTitle) { <th>{{ transferTitle }}</th> }
    </tr>
  `,
  styles: [`
    th { white-space: nowrap; }
    th.search-cell { padding: 0.35em 0.5em; }
    span { padding: 0.6em; }
    span.cost { padding: 1.2em; }
  `]
})
export class SkillListHeaderComponent extends SortedTableHeaderComponent implements OnInit {
  @Input() hasInherit = false;
  @Input() hasTarget = true;
  @Input() hasRank = true;
  @Input() isSticky = false;
  @Input() lang = 'en';
  @Input() transferTitle = '';
  @Input() searchQuery = '';
  @Input() searchHints: SearchHint[] = [];
  @Input() searchPlaceholder = '';
  @Input() matchCount = 0;
  @Input() totalCount = 0;
  @Input() unknownTerms: string[] = [];
  @Input() filterElems: string[] = [];
  @Input() filterTargets: string[] = [];
  searchQueryChanged = output<string>();
  sortResetRequested = output<void>();
  skillHeaderLen = 4;
  acquireHeaderLen = 1;
  msgs = Translations.SkillListComponent;

  ngOnInit() {
    this.nextColIndices();
  }

  private nextColIndices() {
    if (this.hasInherit) {
      this.skillHeaderLen += 1;
    } if (this.hasTarget) {
      this.skillHeaderLen += 1;
    } if (this.hasRank) {
      this.skillHeaderLen += 1;
    } if (this.transferTitle) {
      this.acquireHeaderLen += 1;
    }
  }
}
