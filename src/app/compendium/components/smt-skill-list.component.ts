import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PositionEdgesService } from '../../shared/position-edges.service';
import { SearchStateService } from '../../shared/search/search-state.service';
import { SearchHint } from '../../shared/search/search-bar.component';
import { parseQuery } from '../../shared/search/query-parser';
import { compileSkillFilter, SKILL_FILTER_HINTS } from '../models/skill-filter';
import { displayLvl } from '../models/demon-filter';
import { FUSION_DATA_SERVICE } from '../constants';
import { SkillListComponent } from '../../compendium/bases/skill-list.component';
import { Skill } from '../models';
import { SkillCostToStringPipe, SkillLevelToShortStringPipeLocale, SkillLevelToStringPipe, TranslateElementLabelPipe } from '../pipes';
import { SkillListHeaderComponent } from './skill-list-header.component';
import { PositionStickyDirective } from '../../shared/position-sticky.directive';
import { ColumnWidthsDirective } from '../../shared/column-widths.directive';

@Component({
  selector: 'tr.app-smt-skill-list-row',
  imports: [
    CommonModule, RouterModule,
    SkillCostToStringPipe, SkillLevelToShortStringPipeLocale, SkillLevelToStringPipe, TranslateElementLabelPipe
  ],
  template: `
    <td><div [title]="data.element | translateElementLabel:lang" class="element-icon {{ data.element }}">{{ data.element }}</div></td>
    <td>{{ data.name }}</td>
    <td [style.color]="data.cost ? null: 'transparent'">{{ data.cost | skillCostToString }}</td>
    @if (data.damage) {
      <td>
        {{ data.damage }}
        {{ data.element }}
        damage{{ data.hits ? ' x' + data.hits : '' }}{{ data.effect ? ', ' + data.effect : '' }}
      </td>
    }
    @if (!data.damage) { <td>{{ data.effect }}</td> }
    @if (hasTarget)    { <td><div class="target-icon a{{ data.target || 'Self' }}">{{ data.target || 'Self' }}</div></td> }
    @if (hasRank)      { <td [style.color]="data.rank !== 99 ? null: 'transparent'">{{ data.rank }}</td> }
    @if (hasInherit)   { <td><div class="element-icon {{ data.inherit }}">{{ data.inherit }}</div></td> }
    @if (hasLvl)       { <td [ngClass]="'lvl' + data.level.toString()">{{ data.level | skillLevelToString }}</td> }
    @if (hasLearned) {
      <td>
        <ul class="learned-list">
          @for (entry of data.learnedBy; track entry) {
            <li class="learned">
              <a routerLink="../{{ isPersona ? 'personas' : 'demons' }}/{{ entry.demon }}">{{ entry.demon }}</a>
              @if (demonLvls[entry.demon]) { <span class="dlvl">Lv{{ demonLvls[entry.demon] }}</span> }
              <span [ngClass]="['slvl', entry.level < 2 ? 'innate' : '']">{{ learnText(entry.level) }}</span>
            </li>
          }
        </ul>
      </td>
    }
    @if (hasTransferTitle) {
      <td>
        <ul class="learned-list">
          @for (entry of data.transfer; track entry) {
            <li class="learned">
              @if (entry.level >= -99) {
                <a routerLink="../{{ hasSkillCards ? 'personas' : 'demons' }}/{{ entry.demon }}">{{ entry.demon }}</a>
                @if (demonLvls[entry.demon]) { <span class="dlvl">Lv{{ demonLvls[entry.demon] }}</span> }
                <span [ngClass]="['slvl', entry.level < 2 ? 'innate' : '']">{{ learnText(entry.level) }}</span>
              }
              @if (entry.level < -99) {
                <span class="plain">{{ entry.demon }}</span>
              }
            </li>
          }
        </ul>
      </td>
    }
  `,
  styles: [`
    .learned-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25em;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .learned {
      display: flex;
      align-items: baseline;
      gap: 0.3em;
      padding: 0.05em 0.4em;
      background-color: #1b1b1b;
      border: solid 1px #333333;
      border-radius: 999px;
      white-space: nowrap;
    }
    .learned .dlvl { color: #aaaaaa; font-size: 0.8em; }
    .learned .slvl { color: #cccccc; font-size: 0.8em; }
    .learned .slvl.innate { color: #9edc9e; }
    .learned .plain { color: #cccccc; }
  `]
})
export class SmtSkillListRowComponent {
  @Input() demonLvls: { [demon: string]: number } = {};
  private skillLevelPipe = new SkillLevelToShortStringPipeLocale();

  // "innate" reads better than an empty cell, and "at 12" better than "(12)".
  learnText(level: number): string {
    if (level < 2) { return 'innate'; }

    const short = this.skillLevelPipe.transform(level, this.lang);

    return short ? 'at ' + short.replace(/[()]/g, '') : '';
  }

  @Input() hasInherit = false;
  @Input() hasTarget = true;
  @Input() hasRank = true;
  @Input() hasLearned = true;
  @Input() hasLvl = false;
  @Input() isPersona = false;
  @Input() hasTransferTitle = false;
  @Input() hasSkillCards = false;
  @Input() skillLvl = -1;
  @Input() lang = 'en';
  @Input() data: Skill;
}

@Component({
  selector: 'app-smt-skill-list',
  imports: [
    CommonModule,
    ColumnWidthsDirective, PositionStickyDirective,
    SkillListHeaderComponent, SmtSkillListRowComponent
  ],
  providers: [PositionEdgesService],
  template: `
    <table appPositionSticky class="list-table">
      <tfoot #stickyHeader appColumnWidths
        class="app-skill-list-header sticky-header"
        [hasInherit]="!!inheritOrder"
        [hasTarget]="hasTarget"
        [hasRank]="hasRank"
        [isSticky]="true"
        [lang]="lang"
        [transferTitle]="transferTitle"
        [searchQuery]="searchQuery"
        [searchHints]="searchHints"
        [searchPlaceholder]="searchPlaceholder"
        [matchCount]="matchCount"
        [totalCount]="rowData.length"
        [unknownTerms]="unknownTerms"
        [filterElems]="filterElems"
        [filterTargets]="filterTargets"
        [sortFunIndex]="sortFunIndex"
        (sortFunIndexChanged)="sortFunIndex = $event"
        (searchQueryChanged)="nextSearchQuery($event)"
        (sortResetRequested)="resetSort()">
      </tfoot>
    </table>
    <table class="list-table">
      <tfoot #hiddenHeader appColumnWidths
        class="app-skill-list-header"
        [hasInherit]="!!inheritOrder"
        [hasTarget]="hasTarget"
        [hasRank]="hasRank"
        [lang]="lang"
        [transferTitle]="transferTitle"
        [searchQuery]="searchQuery"
        [style.visibility]="'collapse'">
      </tfoot>
      <tbody>
        @for (data of rowData; track data) {
          <tr class="app-smt-skill-list-row"
            [hasInherit]="!!inheritOrder"
            [hasTarget]="hasTarget"
            [hasRank]="hasRank"
            [isPersona]="isPersona"
            [hasTransferTitle]="!!transferTitle"
            [hasSkillCards]="transferTitle.includes('Card')"
            [lang]="lang"
            [demonLvls]="demonLvls"
            [data]="data"
            [ngClass]="{
              extra: data.rank > 70 && data.rank < 90,
              unique: data.rank > 90,
              hidden: filterActive && !visibleSkills.has(data)
            }">
          </tr>
        }
      </tbody>
    </table>
  `
})
export class SmtSkillListComponent extends SkillListComponent<Skill> {
  @Input() hasTarget = false;
  @Input() hasRank = true;
  @Input() isPersona = false;
  @Input() lang = 'en';
  @Input() transferTitle = '';

  private searchState = inject(SearchStateService);
  private route = inject(ActivatedRoute);
  private fusionData = inject(FUSION_DATA_SERVICE, { optional: true });

  searchQuery = '';
  searchHints: SearchHint[] = SKILL_FILTER_HINTS;
  searchPlaceholder = 'name, effect, elem:fire, cost:<=20, by:pixie';
  matchCount = 0;
  unknownTerms: string[] = [];
  filterActive = false;
  visibleSkills = new Set<Skill>();
  filterElems: string[] = [];
  filterTargets: string[] = [];
  demonLvls: { [demon: string]: number } = {};

  override ngOnInit() {
    super.ngOnInit();
    this.nextDemonLvls();
    this.searchQuery = this.searchState.read(this.route, 'skills', 'q');
    this.refilter();
  }

  override sort() {
    super.sort();
    this.refilter();
  }

  nextSearchQuery(query: string) {
    this.searchQuery = query;
    this.searchState.write(this.route, 'skills', 'q', query);
    this.refilter();
  }

  resetSort() {
    this.sortFunIndex = 0;
  }

  // Levels for the demons named in the learned-by and transfer columns.
  private nextDemonLvls() {
    const compendium = this.fusionData ? this.fusionData.compendium$() : null;

    if (!compendium) { return; }

    const lvls: { [demon: string]: number } = {};

    for (const demon of compendium.allDemons) {
      lvls[demon.name] = displayLvl(demon.lvl);
    }

    this.demonLvls = lvls;
  }

  // The options the buttons offer come from the skills actually listed.
  private nextFilterOptions() {
    const elems: string[] = [];
    const targets: string[] = [];

    for (const skill of this.rowData) {
      if (skill.element && elems.indexOf(skill.element) === -1) { elems.push(skill.element); }
      if (skill.target && targets.indexOf(skill.target) === -1) { targets.push(skill.target); }
    }

    this.filterElems = elems;
    this.filterTargets = targets.sort();
  }

  private refilter() {
    this.nextFilterOptions();
    const query = parseQuery(this.searchQuery);
    const filter = compileSkillFilter(query);

    this.unknownTerms = filter.unknownTerms;
    this.filterActive = filter.unknownTerms.length < query.terms.length;
    this.visibleSkills = new Set(this.filterActive ? this.rowData.filter(filter.predicate) : []);
    this.matchCount = this.filterActive ? this.visibleSkills.size : this.rowData.length;
  }
}
