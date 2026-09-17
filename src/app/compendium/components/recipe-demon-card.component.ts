import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Compendium, Demon, Skill } from '../models';
import { displayLvl, resistCode } from '../models/demon-filter';
import { OwnedStarComponent } from './owned-star.component';
import { translateElementLabel } from '../models/translator';

const RESIST_WORDS: { [code: string]: string } = {
  wk: 'weak', no: 'normal', rs: 'resists', nu: 'nulls', rp: 'repels', ab: 'drains', fr: 'fatal'
};
import {
  ReslvlToColorPipe, ReslvlToStringLocalePipe, SkillLevelToStringPipe
} from '../pipes';

export interface CardSkill {
  skill: Skill;
  level: number;
}

export function cardSkills(demon: Demon, compendium: Compendium): CardSkill[] {
  if (!demon || !compendium || !demon.skills) { return []; }

  return Object.keys(demon.skills)
    .map(name => ({ skill: compendium.getSkill(name), level: demon.skills[name] }))
    .filter(entry => !!entry.skill)
    .sort((a, b) => a.level - b.level);
}

// The panel above each picker: who this demon is, what it is weak to, and
// every skill it brings with the level it shows up at.
@Component({
  selector: 'app-recipe-demon-card',
  imports: [
    CommonModule, OwnedStarComponent,
    ReslvlToColorPipe, ReslvlToStringLocalePipe, SkillLevelToStringPipe
  ],
  template: `
    @let demon = demon$();
    @if (demon && demon.name !== '-') {
      <div class="card">
        <div class="card-head">
          <app-owned-star [name]="demon.name"></app-owned-star>
          <span class="lvl">Lvl {{ lvl$() }}</span>
          <span class="race">{{ demon.race }}</span>
          <span class="name">{{ demon.name }}</span>
        </div>

        @if (resistHeaders().length && demon.resists?.length) {
          <div class="row resists">
            @for (elem of resistHeaders(); track elem; let i = $index) {
              <span class="res tip" [attr.data-tip]="resistTip(elem, i)">
                <div class="element-icon {{ elem }}"></div>
                <span [ngClass]="['reslvl', demon.resists[i] | reslvlToColor]">
                  {{ demon.resists[i] | reslvlToStringLocale:lang() }}
                </span>
              </span>
            }
          </div>
        }

        <div class="row skills">
          @if (!skills$().length) {
            <span class="none">No skills</span>
          }
          @for (entry of skills$(); track entry.skill.name) {
            <span class="skill tip" [attr.data-tip]="tooltip(entry)">
              <div class="element-icon {{ entry.skill.element }}"></div>
              <span class="sname">{{ entry.skill.name }}</span>
              <span class="slvl">{{ entry.level | skillLevelToString }}</span>
            </span>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .card {
      padding: 0.35em 0.5em;
      background-color: #1b1b1b;
      border-radius: 3.5px;
      text-align: left;
      font-weight: normal;
    }
    .card-head {
      display: flex;
      align-items: baseline;
      gap: 0.5em;
      padding-bottom: 0.35em;
      margin-bottom: 0.4em;
      border-bottom: solid 1px #3a3a3a;
    }
    .card-head .lvl, .card-head .race { color: #aaaaaa; font-size: 0.9em; }
    .card-head .name { font-weight: bold; }
    .row { display: flex; flex-wrap: wrap; gap: 0.3em 0.6em; }
    .row.resists {
      padding-bottom: 0.4em;
      margin-bottom: 0.4em;
      border-bottom: solid 1px #3a3a3a;
    }
    .res, .skill { display: flex; align-items: center; gap: 0.2em; }
    .element-icon { flex: 0 0 18px; width: 18px; height: 18px; background-size: 18px; }
    .reslvl { font-size: 0.85em; }
    .reslvl.no { color: #666666; }
    .skill { cursor: help; }
    /* Own tooltip instead of the browser's: it can be styled and it shows up
       straight away rather than after the usual delay. */
    .tip { position: relative; }
    .tip::after {
      content: attr(data-tip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      z-index: 50;
      width: max-content;
      max-width: 22em;
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
    .skill .sname { font-size: 0.9em; }
    .skill .slvl { color: #aaaaaa; font-size: 0.8em; }
    .none { color: #888888; font-size: 0.9em; }
  `]
})
export class RecipeDemonCardComponent {
  demon$ = input.required<Demon>({ alias: 'demon' });
  compendium$ = input.required<Compendium>({ alias: 'compendium' });
  resistHeaders = input<string[]>([]);
  lang = input('en');

  lvl$ = computed(() => displayLvl(this.demon$().lvl));
  skills$ = computed(() => cardSkills(this.demon$(), this.compendium$()));

  resistTip(elem: string, index: number): string {
    const label = translateElementLabel(elem, this.lang());
    const affinity = RESIST_WORDS[resistCode(this.demon$().resists[index])] || '';

    return affinity ? `${label}: ${affinity}` : label;
  }

  tooltip(entry: CardSkill): string {
    const skill = entry.skill;
    const damage = skill.damage ? `${skill.damage} ${skill.element} damage` : '';
    const parts = [damage, skill.effect].filter(part => part);

    return parts.length ? `${skill.name}: ${parts.join(', ')}` : skill.name;
  }
}
