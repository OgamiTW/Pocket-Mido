import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReslvlToColorPipe, ReslvlToStringLocalePipe, ReslvlToStringPipe, ResmodToStringPipe, TranslateCompPipe, TranslateElementLabelPipe } from '../pipes';
import Translations from '../data/translations.json';

@Component({
  selector: 'app-demon-resists',
  imports: [
    CommonModule,
    ReslvlToColorPipe, ReslvlToStringLocalePipe, ReslvlToStringPipe,
    ResmodToStringPipe, TranslateCompPipe, TranslateElementLabelPipe
  ],
  template: `
    @if (resistHeaders.length) {
      <table class="entry-table">
        <thead>
          <tr>
            <th [attr.colspan]="resistHeaders.length + ailmentHeaders.length" class="title">
              <span class="head">
                <span>{{ title || (msgs.Resistances | translateComp:lang) }}</span>
                <button type="button"
                  [ngClass]="['mods-btn', showMods ? 'on' : '']"
                  title="Show or hide the damage multipliers under each affinity"
                  (click)="showMods = !showMods">Multipliers</button>
              </span>
            </th>
          </tr>
          <tr>
            <th [attr.colSpan]="resistHeaders.length">{{ msgs.Element | translateComp:lang }}</th>
            @if (ailmentHeaders.length) {
              <th [attr.colSpan]="ailmentHeaders.length">{{ msgs.Ailment | translateComp:lang }}</th>
            }
          </tr>
          <tr>
            @for (element of resistHeaders; track $index) {
              <th
                [style.width.%]="(ailmentHeaders.length ? 50 : 100) / resistHeaders.length">
                <div [title]="element | translateElementLabel:lang" [ngClass]="['element-icon', element]">{{ element }}</div>
              </th>
            }
            @for (ailment of ailmentHeaders; track $index) {
              <th
                [style.width.%]="50 / ailmentHeaders.length">
                <div [title]="ailment | translateElementLabel:lang" [ngClass]="['ailment-icon', ailment]">{{ ailment }}</div>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          <tr>
            @for (resist of resists; track $index) {
              <td [ngClass]="['resists', resist | reslvlToColor]">
                {{ resist | reslvlToStringLocale:lang }}
              </td>
            }
            @for (resist of ailments; track $index) {
              <td [ngClass]="['resists', resist | reslvlToString]">
                {{ resist | reslvlToStringLocale:lang }}
              </td>
            }
          </tr>
          @if (showMods) {
            <tr>
              @for (resist of resists; track $index) {
                <td [ngClass]="['resists', resist % 1024 === 40 ? 'no' : '']">
                  {{ resist | resmodToString }}
                </td>
              }
              @for (resist of ailments; track $index) {
                <td [ngClass]="['resists', resist % 1024 === 40 ? 'no' : '']">
                  {{ resist | resmodToString }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6em;
    }
    .mods-btn {
      padding: 0.1em 0.45em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
      font: inherit;
      font-size: 0.8em;
      font-weight: normal;
    }
    .mods-btn:hover { color: yellow; }
    .mods-btn.on { border-color: #66BBFF; color: #66BBFF; }
  `]
})
export class DemonResistsComponent {
  @Input() title = '';
  @Input() resistHeaders: string[] = [];
  @Input() resists: number[] = [];
  @Input() ailmentHeaders: string[] = [];
  @Input() ailments: number[] = [];
  @Input() lang = 'en';
  showMods = true;
  msgs = Translations.DemonResistsComponent;
}
