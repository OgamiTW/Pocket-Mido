import { Component, inject, input, computed, effect, linkedSignal, ViewEncapsulation } from '@angular/core';
import { applyEach, disabled, form, FormField } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import { SkillLevelToShortStringPipeLocale, TranslateCompPipe } from '../pipes';
import { Compendium, SquareChart, RecipeGeneratorConfig } from '../../compendium/models';
import { DemonPickerComponent } from './demon-picker.component';
import { RecipeDemonCardComponent } from './recipe-demon-card.component';
import { OwnedStarComponent } from './owned-star.component';
import { SpoilerComponent } from './spoiler.component';
import { RecipeChainComponent, decodeRecipeChain } from './recipe-chain.component';
import { displayLvl } from '../models/demon-filter';
import { PlayerStateService, SavedRecipe } from '../../shared/player/player-state.service';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { createLeftRightCombos, createLeftRightRecipe } from '../models/recipe-generator';
import Translations from '../data/translations.json';
import {
  DemonLookup, SkillPickModel, BLANK_DEMON, BLANK_SKILL,
  makeSkillPickList, SkillLookupMaker, RecipeSkillPickerComponent
} from './recipe-skill-picker.component';

export interface SlotUsage {
  used: number;
  total: number;
}

// Only rows the player can actually choose count as inheritance slots; the
// ones holding the target's innate skills are fixed.
export function countSlots(picks: SkillPickModel[]): SlotUsage {
  const usable = (picks || []).filter(pick => !pick.disabled);

  return {
    used: usable.filter(pick => pick.skill && pick.skill !== BLANK_SKILL.name).length,
    total: usable.length
  };
}

@Component({
  selector: 'app-recipe-generator',
  imports: [
    CommonModule, FormField, TranslateCompPipe,
    DemonPickerComponent, RecipeDemonCardComponent, RecipeChainComponent,
    OwnedStarComponent, SpoilerComponent,
    RecipeSkillPickerComponent
  ],
  template: `
    @let lang = lang$();
    @let recipeConfig = recipeConfig$();
    @let fullRecipe = fullRecipe$();
    <form>
      <ng-template #skillPickerHeader>
        <th style="width: 13%;">{{ msgs.Elem | translateComp:lang }}</th>
        <th style="width: 17%;">{{ msgs.Skill | translateComp:lang }}</th>
        <th style="width: 18%;">{{ msgs.Ingredient | translateComp:lang }}</th>
      </ng-template>

      <h2>{{ msgs.RecipeGenerator | translateComp:lang }}</h2>
      <div class="player-bar">
        <label>
          My lvl
          <input type="number" min="1" placeholder="&ndash;"
            title="Ingredients above this level are marked in red"
            [value]="playerLvl$() || ''"
            (input)="setPlayerLvl($any($event.target).value)">
        </label>
        @if (playerLvl$()) {
          <span class="hint">Ingredients above Lvl {{ playerLvl$() }} show in red.</span>
        }
      </div>
      <table class="entry-table" style="width: 60%;">
        <tr><th colspan="3" class="title">{{ msgs.Target | translateComp:lang }}</th></tr>
        <tr><th colspan="3">{{ msgs.Target | translateComp:lang }}</th></tr>
        <tr>
          <td>
            <app-demon-picker
              [demons]="demonTs$()"
              [selected]="form.demonT().value()"
              [placeholder]="msgs.Target | translateComp:lang"
              (picked)="pickTarget($event)">
            </app-demon-picker>
          </td>
        </tr>
        <tr>
          <td>
            <app-recipe-demon-card
              [demon]="demonT$()"
              [compendium]="compendium$()"
              [resistHeaders]="recipeConfig.resistElems || []"
              [lang]="lang">
            </app-recipe-demon-card>
          </td>
        </tr>
      </table>
      <table class="entry-table" style="width: 100%;">
        <tr><th colspan="7" class="title">{{ msgs.IncludeIngredients | translateComp:lang }}</th></tr>
        <tr>
          <th colspan="3">
            {{ msgs.LeftChain | translateComp:lang }}
            <span class="slots" [class.full]="leftSlots$().used >= leftSlots$().total">
              {{ leftSlots$().used }} / {{ leftSlots$().total }}
            </span>
          </th>
          <th></th>
          <th colspan="3">
            {{ msgs.RightChain | translateComp:lang }}
            <span class="slots" [class.full]="rightSlots$().used >= rightSlots$().total">
              {{ rightSlots$().used }} / {{ rightSlots$().total }}
            </span>
          </th>
        </tr>
        <tr>
          <td colspan="3">
            <app-demon-picker
              [demons]="demonLs$()"
              [selected]="form.demonL().value()"
              [counts]="demonLCounts$()"
              [placeholder]="msgs.LeftChain | translateComp:lang"
              (picked)="pickLeft($event)">
            </app-demon-picker>
          </td>
          <td></td>
          <td colspan="3">
            <app-demon-picker
              [demons]="currentDemonRs$()"
              [selected]="form.demonR().value()"
              [placeholder]="msgs.RightChain | translateComp:lang"
              (picked)="pickRight($event)">
            </app-demon-picker>
          </td>
        </tr>
        <tr>
          <td colspan="3">
            <app-recipe-demon-card
              [demon]="demonL$()"
              [compendium]="compendium$()"
              [resistHeaders]="recipeConfig.resistElems || []"
              [lang]="lang">
            </app-recipe-demon-card>
          </td>
          <td></td>
          <td colspan="3">
            <app-recipe-demon-card
              [demon]="demonR$()"
              [compendium]="compendium$()"
              [resistHeaders]="recipeConfig.resistElems || []"
              [lang]="lang">
            </app-recipe-demon-card>
          </td>
        </tr>
        <tr>
          <ng-container *ngTemplateOutlet="skillPickerHeader"></ng-container>
          <th style="width: 4%;"></th>
          <ng-container *ngTemplateOutlet="skillPickerHeader"></ng-container>
        </tr>
        <ng-container>
          @for (_ of form.ingredLs; track $index) {
            <tr>
              @let leftSkill = form.ingredLs[$index];
              @let rightSkill = form.ingredRs[$index];
              <app-recipe-skill-picker
                [skillPickForm]="leftSkill"
                [skillLookupMaker]="skillLookupMaker$()"
                [displayElems]="recipeConfig.displayElems"
                [skillIs]="!leftSkill.disabled().value() ? skillLs$() : skillTs$()">
              </app-recipe-skill-picker>
              <td></td>
              <app-recipe-skill-picker
                [skillPickForm]="rightSkill"
                [skillLookupMaker]="skillLookupMaker$()"
                [displayElems]="recipeConfig.displayElems"
                [skillIs]="!rightSkill.disabled().value() ? skillRs$() : skillTs$()">
              </app-recipe-skill-picker>
            </tr>
          }
        </ng-container>
      </table>

      @if (fullRecipe) {
        <table class="entry-table">
          <tr><th colspan="2" class="title">{{ msgs.FusionRecipe | translateComp:lang }}</th></tr>
          <tr>
            <td colspan="2" class="how">
              Work through each chain from the top. What a step makes becomes the first
              ingredient of the step below it. Rounded tags are the skills that ingredient
              carries into the fusion, and the flag saves a step to your plans.
            </td>
          </tr>
          <tr><th colspan="2" class="chain-head">{{ msgs.LeftChain | translateComp:lang }}</th></tr>
          <tr>
            <td colspan="2" class="chain-cell">
              <app-recipe-chain
                [steps]="recipeLeftSteps$()"
                [emptyText]="msgs.NoRecipesFound | translateComp:lang">
              </app-recipe-chain>
            </td>
          </tr>
          <tr><th colspan="2" class="chain-head">{{ msgs.RightChain | translateComp:lang }}</th></tr>
          <tr>
            <td colspan="2" class="chain-cell">
              <app-recipe-chain
                [steps]="recipeRightSteps$()"
                [emptyText]="msgs.NoRecipesFound | translateComp:lang">
              </app-recipe-chain>
            </td>
          </tr>
          @if (fusionPrereq$()) {
            <tr><td colspan="2" class="prereq">
              <app-spoiler [label]="msgs.SpecialFusionCondition | translateComp:lang">
                {{ fusionPrereq$() }}
              </app-spoiler>
            </td></tr>
          }
          <tr>
            <td colspan="2" class="final">
              @if (fullRecipe.stepR.length) {
                <div class="final-line">
                  @if (finalRecipe$(); as recipe) {
                    <button type="button"
                      [ngClass]="['plan-btn', plannedFinal() ? 'on' : '']"
                      [title]="plannedFinal() ? 'Forget this plan' : 'Save this fusion to my plans'"
                      (click)="toggleFinalPlan(recipe)">&#9873;</button>
                  }
                  @for (ingred of finalIngredients$(); track ingred.name; let last = $last) {
                    <span class="side" [class.over]="outOfReach(ingred.lvl)">
                      <span class="demon">{{ ingred.name }}</span>
                      <span class="lvl">Lvl {{ ingred.lvl }}</span>
                      @for (skill of ingred.skills; track skill) {
                        <span class="chip">{{ skill }}</span>
                      }
                    </span>
                    @if (!last) { <span class="op">&times;</span> }
                  }
                  <span class="op arrow">&rarr;</span>
                  <span class="side">
                    <app-owned-star [name]="fullRecipe.result"></app-owned-star>
                    <span class="target">{{ fullRecipe.result }}</span>
                    <span class="lvl">Lvl {{ resultLvl$() }}</span>
                  </span>
                </div>
                <div class="final-skills">
                  <span class="label">Ends up with</span>
                  @for (skill of resultSkills$(); track skill) {
                    <span class="chip">{{ skill }}</span>
                  }
                </div>
              } @else {
                <span class="none">{{ msgs.NoRecipesFound | translateComp:lang }}</span>
              }
            </td>
          </tr>
        </table>
      }
    </form>
  `,
  styles: [`
    select { min-height: 25px; width: 100%; }
    .player-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6em;
      padding-bottom: 0.6em;
    }
    .player-bar label { color: #aaaaaa; font-size: 0.9em; }
    .player-bar input {
      width: 5em;
      margin-left: 0.4em;
      padding: 0.2em 0.3em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    .player-bar input:focus { outline: none; border-color: #66BBFF; }
    .player-bar .hint { color: #777777; font-size: 0.85em; }
    .slots { color: #aaaaaa; font-weight: normal; font-size: 0.9em; }
    .slots.full { color: gold; }
    td.how {
      padding: 0.6em 0.8em;
      color: #aaaaaa;
      font-size: 0.9em;
      line-height: 1.4;
      text-align: left;
    }
    th.chain-head { text-align: left; padding: 0.35em 0.6em; }
    /* Each chain gets the whole width now: two narrow columns left the steps
       wrapping onto themselves as soon as a demon carried skills. */
    td.chain-cell { padding: 0.5em; }
    td.prereq { padding: 0.8em; text-align: center; color: #ffcc66; }
    td.final { padding: 0.8em; text-align: center; }
    .final-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.35em;
      font-size: 1.05em;
    }
    .final-line .side { display: flex; align-items: center; gap: 0.25em; }
    .final-line .demon { font-weight: bold; }
    .final-line .lvl { color: #aaaaaa; font-size: 0.85em; }
    .final-line .plan-btn {
      padding: 0 0.3em;
      color: #555555;
      background: none;
      border: 0;
      cursor: pointer;
      font-size: 1.05em;
    }
    .final-line .plan-btn.on { color: #66BBFF; }
    .final-line .plan-btn:hover { color: yellow; }
    .final-line .side.over .demon, .final-line .side.over .lvl { color: #ff7070; }
    .final-line .op { color: #888888; }
    .final-line .op.arrow { color: #66BBFF; }
    .final-line .target { font-weight: bold; color: #9edc9e; }
    .final-skills {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.3em;
      padding-top: 0.6em;
    }
    .final-skills .label { color: #aaaaaa; font-size: 0.85em; padding-right: 0.2em; }
    .chip {
      padding: 0.05em 0.4em;
      color: #cccccc;
      background-color: #2c2c2c;
      border-radius: 999px;
      font-size: 0.8em;
      white-space: nowrap;
    }
    .none { color: #888888; }

  `],
  encapsulation: ViewEncapsulation.None
})
export class RecipeGeneratorComponent {
  compendium$ = input.required<Compendium>({ alias: 'compendium' });
  squareChart$ = input.required<SquareChart>({ alias: 'squareChart' });
  recipeConfig$ = input.required<RecipeGeneratorConfig>({ alias: 'recipeConfig' });
  maxSkills$ = input(8, { alias: 'maxSkills' });
  lang$ = input('en', { alias: 'lang' });

  msgs = Translations.RecipeGeneratorComponent;
  skillLevelPipe = new SkillLevelToShortStringPipeLocale();
  private playerState = inject(PlayerStateService);
  private route = inject(ActivatedRoute);
  // Chaining works by changing this parameter, so follow it rather than
  // reading it once: the component is not rebuilt when only the query changes.
  private requestedTarget$ = toSignal(this.route.queryParamMap, { initialValue: null });

  recipeInputModel$ = linkedSignal(() => ({
    demonT: BLANK_DEMON.name,
    demonL: BLANK_DEMON.name,
    demonR: BLANK_DEMON.name,
    ingredLs: makeSkillPickList(this.maxSkills$() / 2),
    ingredRs: makeSkillPickList(this.maxSkills$() / 2)
  }));

  form = form(this.recipeInputModel$, schemaPath => {
    applyEach(schemaPath.ingredLs, itemPath => {
      disabled(itemPath, { when: ({ valueOf }) => valueOf(itemPath.disabled)})
    });
    applyEach(schemaPath.ingredRs, itemPath => {
      disabled(itemPath, { when: ({ valueOf }) => valueOf(itemPath.disabled)})
    });
  });

  constructor() {
    effect(() => this.form.demonT().value.update(demonT =>
      this.demonTs$().find(d => d.name === demonT) ? demonT : this.demonTs$()[0].name
    ));
    effect(() => this.form.demonL().value.update(demonL =>
      this.demonLs$().find(d => d.name === demonL) ? demonL : this.demonLs$()[0].name
    ));
    effect(() => this.form.demonR().value.update(demonR =>
      this.demonRs$()[this.demonL$().name]?.find(d => d.name === demonR) ?
        demonR : this.demonRs$()[this.demonL$().name]?.[0].name ||
          Object.values(this.demonRs$())[0][0].name
    ));
    // Arriving with ?target=, from a demon page or from a link in the chain.
    effect(() => {
      const target = this.requestedTarget$()?.get('target');

      if (!target || !this.demonTs$().some(demon => demon.name === target)) { return; }
      if (this.form.demonT().value() === target) { return; }

      this.form.demonT().value.set(target);
      setTimeout(() => this.initWithInnate());
    });

    setTimeout(() => this.initWithInnate());
  }

  initWithInnate(){
    const ingredIs: SkillPickModel[][] = [[], []];

    for (let i = 0; i < this.recipeInputModel$().ingredLs.length; i++) {
      for (let j = 0; j < 2; j++) {
        const skill = this.innateSkills$()[2 * i + j];
        ingredIs[j].push({
          disabled: skill.name !== '-' && this.recipeConfig$().restrictInherits,
          elem: '-',
          skill: skill.name,
          demon: skill.name !== '-' ? this.demonT$().name : '-'
        });
      }
    }

    this.recipeInputModel$.update(model => ({
      ...model,
      ingredLs: ingredIs[0],
      ingredRs: ingredIs[1]
    }));
  }

  demonT$ = computed(() => this.compendium$().getDemon(this.form.demonT().value()) ?? BLANK_DEMON);
  demonL$ = computed(() => this.compendium$().getDemon(this.form.demonL().value()) ?? BLANK_DEMON);
  demonR$ = computed(() => this.compendium$().getDemon(this.form.demonR().value()) ?? BLANK_DEMON);
  skillLookupMaker$ = computed(() => new SkillLookupMaker(
    this.compendium$(), this.recipeConfig$().inheritElems, this.recipeConfig$().skillElems, false
  ));

  skillTs$ = computed(() => this.skillLookupMaker$().getInheritSkills(this.demonT$(), this.demonT$()));
  skillLs$ = computed(() => this.skillLookupMaker$().getInheritSkills(this.demonT$(), this.demonL$()));
  skillRs$ = computed(() => this.skillLookupMaker$().getInheritSkills(this.demonT$(), this.demonR$()));
  innateSkills$ = computed(() => this.skillLookupMaker$().getInnateSkills(this.demonT$()));

  leftSlots$ = computed(() => countSlots(this.recipeInputModel$().ingredLs));
  rightSlots$ = computed(() => countSlots(this.recipeInputModel$().ingredRs));

  currentDemonRs$ = computed(() => this.demonRs$()[this.demonL$().name] || []);
  demonLCounts$ = computed(() => Object.keys(this.demonRs$())
    .reduce<{ [name: string]: number }>((counts, name) => {
      counts[name] = this.demonRs$()[name].length;
      return counts;
    }, {}));

  pickTarget(name: string) {
    this.form.demonT().value.set(name);
    this.initWithInnate();
  }

  pickLeft(name: string) {
    this.form.demonL().value.set(name);
  }

  pickRight(name: string) {
    this.form.demonR().value.set(name);
  }

  demonTs$ = computed(() => {
    const demonTs = this.compendium$().allDemons.filter(
      d => d.fusion !== 'party' && !d.isEnemy &&
      (d.fusion === 'normal' || d.fusion === 'special')
    );
    demonTs.sort((a, b) => a.name.localeCompare(b.name));
    return demonTs;
  });

  demonRs$ = computed(() => {
    const demonRs: DemonLookup = {};
    const combos = createLeftRightCombos(this.demonT$().name, this.compendium$(), this.squareChart$(), this.recipeConfig$());

    for (const [nameL, nameRs] of Object.entries(combos)) {
      demonRs[nameL] = nameRs.map(nameR => this.compendium$().getDemon(nameR));
      demonRs[nameL].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (Object.keys(demonRs).length === 0) { demonRs['-'] = [BLANK_DEMON]; }
    return demonRs;
  });

  demonLs$ = computed(() => {
    const demonLs = Object.keys(this.demonRs$()).map(nameL => this.compendium$().getDemon(nameL) || BLANK_DEMON);
    demonLs.sort((a, b) => this.demonRs$()[b.name].length - this.demonRs$()[a.name].length);
    return demonLs;
  });

  fullRecipe$ = computed(() => {
    const { demonT, demonL, demonR, ingredLs: inputLs, ingredRs: inputRs } = this.recipeInputModel$()
    const [ingredLs, ingredRs] = [inputLs, inputRs].map(inputIs => inputIs
      .filter(i => !i.disabled && i.demon !== '-' && i.demon !== demonT)
      .reduce<{ [skill: string]: string }>((acc, i) => { acc[i.skill] = i.demon; return acc; }, {})
    );

    const lrConfig = { result: demonT, targetL: demonL, targetR: demonR, ingredLs, ingredRs };
    return createLeftRightRecipe(lrConfig, this.compendium$(), this.squareChart$(), this.recipeConfig$());
  });

  fullRecipeSkillRef$ = computed(() => {
    const skillRef: { [demon: string]: string[] } = {};

    for (const [skill, demon] of Object.entries(this.fullRecipe$().skills)) {
      if (!skillRef[demon]) { skillRef[demon] = []; }
      const slvl = this.compendium$().getDemon(demon).skills[skill];
      skillRef[demon].push(`${skill} ${this.skillLevelPipe.transform(slvl, this.lang$())}`.trim());
    }

    return skillRef;
  });

  lvlOf$ = computed(() => (name: string) => {
    const demon = this.compendium$().getDemon(name);
    return demon ? displayLvl(demon.lvl) : 0;
  });

  recipeLeftSteps$ = computed(() =>
    decodeRecipeChain(this.fullRecipe$().chain1, this.fullRecipeSkillRef$(), this.lvlOf$()));
  recipeRightSteps$ = computed(() =>
    decodeRecipeChain(this.fullRecipe$().chain2, this.fullRecipeSkillRef$(), this.lvlOf$()));

  finalIngredients$ = computed(() => this.fullRecipe$().stepR.map(name => ({
    name,
    lvl: this.lvlOf$()(name),
    skills: this.fullRecipeSkillRef$()[name] || []
  })));

  resultLvl$ = computed(() => this.lvlOf$()(this.fullRecipe$().result));

  // Only a two-ingredient fusion maps onto a saved plan.
  finalRecipe$ = computed<SavedRecipe>(() => {
    const ingredients = this.fullRecipe$().stepR;

    return ingredients.length === 2
      ? { a: ingredients[0], b: ingredients[1], result: this.fullRecipe$().result }
      : null;
  });

  plannedFinal(): boolean {
    const recipe = this.finalRecipe$();
    return !!recipe && this.playerState.hasRecipe(recipe);
  }

  toggleFinalPlan(recipe: SavedRecipe) {
    this.playerState.toggleRecipe(recipe);
  }

  playerLvl$ = this.playerState.lvl$;

  setPlayerLvl(lvl: string) {
    this.playerState.setLvl(parseInt(lvl, 10));
  }

  outOfReach(lvl: number): boolean {
    const mine = this.playerState.lvl$();
    return !!mine && !!lvl && lvl > mine;
  }

  resultSkills$ = computed(() => {
    const resultSkills = []

    for (const [skill, slvl] of Object.entries(this.compendium$().getDemon(this.fullRecipe$().result).skills)
      .filter(s => s[1] < 2000)
      .sort((a, b) => a[1] - b[1])
    ) {
      resultSkills.push(`${skill} ${this.skillLevelPipe.transform(slvl, this.lang$())}`.trim());
    }

    return resultSkills;
  });

  fusionPrereq$ = computed(() => this.compendium$().getDemon(this.fullRecipe$().result).prereq || '');
}
