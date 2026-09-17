import { Component, input, effect, computed } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { Demon, Skill, Compendium } from '../../compendium/models';
import { SkillPickerComponent } from './skill-picker.component';
import { ElemPickerComponent, ElemOption } from './elem-picker.component';
import { DemonPickerComponent } from './demon-picker.component';
import { SkillCostToStringPipe } from '../../compendium/pipes';

export interface DemonLookup { [key: string]: Demon[]; }
export interface SkillLookup { [key: string]: Skill[]; }
export interface SkillPickModel {
  disabled: boolean;
  elem: string;
  skill: string;
  demon: string;
};

export const BLANK_DEMON: Demon = {
  name: '-', race: '-', lvl: 0, currLvl: 0, price: 0, inherits: 0,
  skills: {}, stats: [], resists: [], affinities: [],
  fusion: 'normal', prereq: '', searchTags: '-'
};

export const BLANK_SKILL: Skill = {
  name: '-', element: '-', inherit: '-', rank: 99, cost: 0,
  effect: '', target: '', level: 0, learnedBy: [{ demon: '-', level: 0 }]
};

export function makeSkillPickList(length: number): SkillPickModel[] {
  return Array.from({ length }, (): SkillPickModel => ({
    disabled: false,
    elem: '-',
    skill: BLANK_SKILL.name,
    demon: BLANK_DEMON.name
  }));
}

export class SkillLookupMaker {
  learnedBy: DemonLookup;
  elemTyped: SkillLookup;

  constructor(
    public compendium: Compendium,
    public inheritElems: string[],
    public skillElems: string[],
    public includeUnique: boolean
  ) {
    this.learnedBy = { '-': [BLANK_DEMON] };
    this.elemTyped = { '-': [BLANK_SKILL] };

    for (const demon of this.compendium.allDemons.filter(d => d.fusion !== 'party' && !d.isEnemy)) {
      for (const sname of Object.keys(demon.skills)) {
        if (!this.learnedBy[sname]) { this.learnedBy[sname] = []; }
        this.learnedBy[sname].push(demon);
      }
    }

    for (const skill of this.compendium.allSkills.filter(s =>
      (this.includeUnique || s.rank < 50) && this.learnedBy[s.name])
    ) {
      if (!this.elemTyped[skill.inherit]) { this.elemTyped[skill.inherit] = []; }
      this.elemTyped[skill.inherit].push(skill);
    }

    for (const sl of Object.values(this.elemTyped)) { sl.sort((a, b) => a.rank - b.rank); }
    for (const dl of Object.values(this.learnedBy)) { dl.sort((a, b) => a.lvl - b.lvl); }
  }

  getInnateSkills(demonT: Demon): Skill[] {
    return Object.entries(demonT.skills)
      .filter(pair => pair[1] < 2)
      .map(pair => this.compendium.getSkill(pair[0]))
      .concat(Array<Skill>(12).fill(BLANK_SKILL));
  }

  getInheritSkills(demonT: Demon, demonI: Demon): SkillLookup {
    const excludeElems: string[] = [];

    for (let i = 0; i < this.inheritElems.length; i++) {
      if (!(demonI.inherits & demonT.inherits & (1 << i))) {
        excludeElems.push(this.inheritElems[this.inheritElems.length - i - 1]);
      }
    }

    const elems = this.skillElems.filter(e => !excludeElems.includes(e));
    const skillTs = Object.keys(demonT.skills)
      .filter(s => demonT.skills[s] < 100);
    const skillIs = Object.keys(demonI.skills)
      .filter(s => demonI.skills[s] < 100)
      .map(s => this.compendium.getSkill(s))
      .filter(s => !skillTs.includes(s.name) && elems.includes(s.element) && s.rank < 50);

    return elems.reduce((acc, e) =>
      { acc[e] = this.elemTyped[e]; return acc; },
      { '-': [BLANK_SKILL].concat(skillTs.map(s => this.compendium.getSkill(s)), skillIs) }
    );
  }
}

@Component({
  selector: 'app-recipe-skill-picker',
  imports: [SkillPickerComponent, DemonPickerComponent, ElemPickerComponent, SkillCostToStringPipe],
  template: `
    <td>
      @if (isLocked$()) {
        <span class="locked">{{ elemLabel(elem$()) }}</span>
      } @else {
        <app-elem-picker
          [options]="elemOptions$()"
          [selected]="elem$()"
          (picked)="form$().elem().value.set($event)">
        </app-elem-picker>
      }
    </td>
    <td>
      @if (isLocked$()) {
        <span class="locked tip" [attr.data-tip]="skillTip()">{{ skill$().name }}</span>
      } @else {
        <app-skill-picker
          [skills]="skillIs$()[elem$()] || []"
          [selected]="form$().skill().value()"
          (picked)="form$().skill().value.set($event)">
        </app-skill-picker>
      }
    </td>
    @if (showDemonPicker$()) {
      <td>
        @if (isLocked$()) {
          <span class="locked">{{ form$().demon().value() }}</span>
        } @else {
          <app-demon-picker
            [demons]="learnedBy$()[skill$().name] || []"
            [selected]="form$().demon().value()"
            (picked)="form$().demon().value.set($event)">
          </app-demon-picker>
        }
      </td>
    } @else {
      <td [style.color]="skill$().cost ? null: 'transparent'">{{ skill$().cost | skillCostToString }}</td>
      <td>{{ skill$().effect }}</td>
      <td>{{ skill$().target }}</td>
    }
  `,
  styles: [`
    .locked { color: #aaaaaa; }
    .tip { position: relative; cursor: help; }
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
  `],
  host: {
    style: 'display: contents;'
  }
})
export class RecipeSkillPickerComponent {
  form$ = input.required<FieldTree<SkillPickModel>>({ alias: 'skillPickForm' });
  skillLookupMaker$ = input.required<SkillLookupMaker>({ alias: 'skillLookupMaker' });
  skillIs$ = input.required<SkillLookup>({ alias: 'skillIs' });
  showDemonPicker$ = input(true, { alias: 'showDemonPicker' });
  displayElems$ = input<{ [elem: string]: string }>({}, { alias: 'displayElems' });

  skillTip(): string {
    const skill = this.skill$();
    return skill.effect ? `${skill.name}: ${skill.effect}` : skill.name;
  }

  elemOptions$ = computed<ElemOption[]>(() => [{ elem: '-', label: 'Any' }].concat(
    this.skillElems$()
      .filter(elem => this.skillIs$()[elem])
      .map(elem => ({ elem, label: this.elemLabel(elem) }))
  ));

  elemLabel(elem: string): string {
    if (elem === '-') { return 'Any'; }
    return this.displayElems$()[elem] || elem;
  }

  constructor() {
    effect(() => this.form$().elem().value.update(elem =>
      this.skillIs$()[elem] ? elem : '-'
    ));
    effect(() => this.form$().skill().value.update(skill =>
      this.skillIs$()[this.elem$()]?.find(s => s.name === skill) ?
        skill : this.skillIs$()[this.elem$()]?.[0].name ||
          Object.values(this.skillIs$())[0][0].name
    ));
    effect(() => this.form$().demon().value.update(demon =>
      this.learnedBy$()[this.skill$().name]?.find(d => d.name === demon) ?
        demon : this.learnedBy$()[this.skill$().name]?.[0].name ||
          Object.values(this.learnedBy$())[0][0].name
    ));
  }

  skillElems$ = computed(() => this.skillLookupMaker$().skillElems);
  compendium$ = computed(() => this.skillLookupMaker$().compendium);
  learnedBy$ = computed(() => this.skillLookupMaker$().learnedBy);
  elem$ = computed(() => this.form$().elem().value());
  // Rows holding the target's own innate skills are fixed, not chosen.
  isLocked$ = computed(() => this.form$().disabled().value());
  skill$ = computed(() => this.compendium$().getSkill(this.form$().skill().value()) ?? BLANK_SKILL);
  demon$ = computed(() => this.compendium$().getDemon(this.form$().demon().value()) ?? BLANK_DEMON);
}
