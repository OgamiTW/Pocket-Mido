import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Demon } from '../models';
import { displayLvl, resistCode } from '../models/demon-filter';
import { DemonPickerComponent } from './demon-picker.component';
import { OwnedStarComponent } from './owned-star.component';
import { ReslvlToColorPipe, ReslvlToStringLocalePipe, TranslateElementLabelPipe } from '../pipes';

// Worse to better, so demons can be compared on one axis.
const RESIST_RANK = ['wk', 'fr', 'no', 'rs', 'nu', 'rp', 'ab'];

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 4;

export function resistRank(value: number): number {
  return RESIST_RANK.indexOf(resistCode(value));
}

export interface ComparisonRow {
  label: string;
  elem: string;
  isResist: boolean;
  values: number[];
  ranks: number[];
  best: number;
}

export function buildComparison(
  demons: Demon[], statHeaders: string[], resistHeaders: string[]
): ComparisonRow[] {
  const picked = (demons || []).filter(demon => !!demon);

  if (picked.length < MIN_COLUMNS) { return []; }

  const rows: ComparisonRow[] = [];

  const add = (label: string, elem: string, isResist: boolean,
               values: number[], ranks: number[]) => {
    rows.push({ label, elem, isResist, values, ranks, best: Math.max(...ranks) });
  };

  const lvls = picked.map(demon => displayLvl(demon.lvl));
  add('Lvl', '', false, lvls, lvls);

  (statHeaders || []).forEach((label, i) => {
    const values = picked.map(demon => demon.stats[i]);
    add(label, '', false, values, values);
  });

  (resistHeaders || []).forEach((elem, i) => {
    const values = picked.map(demon => demon.resists[i]);
    add(elem, elem, true, values, values.map(resistRank));
  });

  return rows;
}

@Component({
  selector: 'app-demon-comparison',
  imports: [
    CommonModule, DemonPickerComponent, OwnedStarComponent,
    ReslvlToColorPipe, ReslvlToStringLocalePipe, TranslateElementLabelPipe
  ],
  template: `
    @let picked = names();
    <table class="entry-table comparison">
      <thead>
        <tr>
          <th [attr.colspan]="picked.length + 1" class="title">
            Compare
            <span class="controls">
              <button type="button" [disabled]="picked.length >= maxColumns"
                title="Add another demon to compare" (click)="addColumn()">+</button>
              <button type="button" [disabled]="picked.length <= minColumns"
                title="Remove the last one" (click)="removeColumn()">&minus;</button>
            </span>
          </th>
        </tr>
        <tr>
          <th class="axis"></th>
          @for (name of picked; track $index) {
            <th class="pick">
              <app-demon-picker
                [demons]="demons()" [selected]="name" placeholder="Pick one"
                (picked)="setName($index, $event)">
              </app-demon-picker>
            </th>
          }
        </tr>
        <tr>
          <th class="axis"></th>
          @for (name of picked; track $index) {
            <th class="star-cell">
              @if (name) { <app-owned-star [name]="name"></app-owned-star> }
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @if (!rows().length) {
          <tr>
            <td [attr.colspan]="picked.length + 1" class="empty">
              Pick at least two to compare them.
            </td>
          </tr>
        }
        @for (row of rows(); track row.label) {
          <tr>
            <td class="axis">
              @if (row.elem) {
                <div [title]="row.elem | translateElementLabel:lang()" class="element-icon {{ row.elem }}"></div>
              } @else { {{ row.label }} }
            </td>
            @for (value of row.values; track $index) {
              <td [class.better]="isBest(row, $index)">
                @if (row.isResist) {
                  <span [ngClass]="['resists', value | reslvlToColor]">{{ value | reslvlToStringLocale:lang() }}</span>
                } @else { {{ value }} }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    .comparison { width: 100%; }
    .comparison td, .comparison th.pick, .comparison th.star-cell { text-align: center; }
    .comparison td.better { background-color: #1f3a1f; font-weight: bold; }
    .comparison td.axis, .comparison th.axis { width: 6em; color: #aaaaaa; }
    .comparison td.empty { color: #888888; padding: 0.8em; }
    .comparison .element-icon { display: inline-block; width: 20px; height: 20px; }
    .controls { float: right; }
    .controls button {
      width: 1.8em;
      margin-left: 0.2em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
      font: inherit;
    }
    .controls button:hover:not(:disabled) { color: yellow; }
    .controls button:disabled { opacity: 0.4; cursor: default; }
  `]
})
export class DemonComparisonComponent {
  demons = input<Demon[]>([]);
  statHeaders = input<string[]>([]);
  resistHeaders = input<string[]>([]);
  lang = input('en');

  minColumns = MIN_COLUMNS;
  maxColumns = MAX_COLUMNS;

  names = signal<string[]>(['', '']);

  private byName = computed(() => this.demons()
    .reduce<{ [name: string]: Demon }>((acc, demon) => { acc[demon.name] = demon; return acc; }, {}));

  private picked = computed(() => this.names().map(name => this.byName()[name]));

  rows = computed(() => buildComparison(this.picked(), this.statHeaders(), this.resistHeaders()));

  // Only worth pointing out a winner when someone actually wins.
  isBest(row: ComparisonRow, index: number): boolean {
    return row.ranks[index] === row.best && row.ranks.some(rank => rank < row.best);
  }

  setName(index: number, name: string) {
    this.names.update(names => names.map((old, i) => i === index ? name : old));
  }

  addColumn() {
    this.names.update(names => names.length < MAX_COLUMNS ? names.concat('') : names);
  }

  removeColumn() {
    this.names.update(names => names.length > MIN_COLUMNS ? names.slice(0, -1) : names);
  }
}
