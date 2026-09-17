import { Component, Input, OnInit, output } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CategoryEntry, FusionSettings, SettingEntry } from '../models/fusion-settings';
import { SearchBarComponent } from '../../shared/search/search-bar.component';
import { EMPTY_QUERY, ParsedQuery, matchesQueryText, parseQuery } from '../../shared/search/query-parser';

import { translateComp } from '../models/translator';
import { TranslateCompPipe } from '../pipes';
import Translations from  '../data/translations.json';

@Component({
  selector: 'app-fusion-settings',
  imports: [SearchBarComponent, TranslateCompPipe],
  template: `
    <ng-container>
      <h2>{{ msgs.DlcTitle | translateComp:lang }}</h2>
      <table class="entry-table">
        <thead>
          <tr><th class="title">Unlock Conditions</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="search-cell">
              <app-search-bar
                [query]="settingsQuery"
                [matchCount]="matchCount"
                [totalCount]="totalCount"
                placeholder="Filter unlock conditions"
                (queryChanged)="nextSettingsQuery($event)">
              </app-search-bar>
            </td>
          </tr>
          @if (showEnableAll) {
            <tr><th>All Demons</th></tr>
            <tr>
              <td>
                <button (click)="toggledAll.emit(true)" style="width: 50%;">Enable All</button>
                <button (click)="toggledAll.emit(false)" style="width: 50%;">Disable All</button>
              </td>
            </tr>
          }
          @for (cat of fusionSettings.displayHeaders; track cat) {
            @if (visibleSettings(cat).length) {
              <tr><th>{{ cat.category }}</th></tr>
            }
            @for (setting of visibleSettings(cat); track setting) {
              <tr>
                <td>
                  <label>{{ setting.caption }}
                    <input type="checkbox"
                      [checked]="setting.enabled"
                      (change)="toggledName.emit(setting.name)">
                  </label>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </ng-container>
  `,
  styles: [`
    td.search-cell { padding: 0.35em 0.5em; }
  `]
})
export class FusionSettingsComponent implements OnInit {
  @Input() dlcDemons: { name: string, included: boolean }[];
  @Input() lang = 'en';
  @Input() fusionSettings: FusionSettings;
  @Input() showEnableAll = false;
  toggledAll = output<boolean>();
  toggledName = output<string>();
  msgs = Translations.FusionSettingsComponent;

  settingsQuery = '';
  matchCount = 0;
  totalCount = 0;
  private query: ParsedQuery = EMPTY_QUERY;

  constructor(private title: Title) { }

  ngOnInit() {
    this.countMatches();
  }

  nextSettingsQuery(settingsQuery: string) {
    this.settingsQuery = settingsQuery;
    this.query = parseQuery(settingsQuery);
    this.countMatches();
  }

  visibleSettings(cat: CategoryEntry): SettingEntry[] {
    if (this.query.isEmpty || matchesQueryText(this.query, cat.category)) { return cat.settings; }
    return cat.settings.filter(setting => matchesQueryText(this.query, setting.caption));
  }

  private countMatches() {
    let matchCount = 0;
    let totalCount = 0;

    for (const cat of this.fusionSettings?.displayHeaders || []) {
      matchCount += this.visibleSettings(cat).length;
      totalCount += cat.settings.length;
    }

    this.matchCount = matchCount;
    this.totalCount = totalCount;
  }

  @Input() set appTitle(appTitle: string) {
    this.title.setTitle(translateComp(this.msgs.AppTitle, this.lang) + appTitle);
  }
}
