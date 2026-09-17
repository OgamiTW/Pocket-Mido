import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PlayerStateService, SavedRecipe } from '../../shared/player/player-state.service';
import { OwnedStarComponent } from './owned-star.component';

export interface RecipePart {
  name: string;
  lvl: number;
  skills: string[];
}

export interface RecipeIngredient {
  parts: RecipePart[];
}

export interface RecipeStep {
  step: number;
  left: RecipeIngredient;
  right: RecipeIngredient;
  result: RecipeIngredient;
}

export type SkillRef = { [demon: string]: string[] };
export type LvlRef = (name: string) => number;

// A special fusion needing three or more ingredients arrives as one entry with
// the extra demons joined by " x ", so a slot can hold more than one demon.
export function splitIngredient(entry: string): string[] {
  return (entry || '').split(' x ').map(name => name.trim()).filter(name => name);
}

function ingredient(entry: string, skillRef: SkillRef, getLvl: LvlRef): RecipeIngredient {
  return {
    parts: splitIngredient(entry).map(name => ({
      name,
      lvl: getLvl ? getLvl(name) : 0,
      skills: skillRef[name] || []
    }))
  };
}

// The chain arrives flat: [a, b, ab, c, abc, ...]. Every pair fuses into the
// entry that follows it, which then becomes the left side of the next step.
export function decodeRecipeChain(chain: string[], skillRef: SkillRef, getLvl?: LvlRef): RecipeStep[] {
  const steps: RecipeStep[] = [];

  for (let i = 0; i < (chain || []).length - 2; i += 2) {
    steps.push({
      step: steps.length + 1,
      left: ingredient(chain[i], skillRef, getLvl),
      right: ingredient(chain[i + 1], skillRef, getLvl),
      result: ingredient(chain[i + 2], skillRef, getLvl)
    });
  }

  return steps;
}

// A saved plan is a pair of ingredients making one result, so a step with a
// grouped slot (the three-ingredient specials) has no plan to save.
export function stepRecipe(step: RecipeStep): SavedRecipe {
  const slots = [step.left, step.right, step.result];

  if (slots.some(slot => slot.parts.length !== 1)) { return null; }

  return { a: step.left.parts[0].name, b: step.right.parts[0].name, result: step.result.parts[0].name };
}

// The highest level anyone in the chain needs, which is what decides whether
// the recipe is within reach.
export function chainPeakLvl(steps: RecipeStep[]): number {
  return (steps || []).reduce((peak, step) =>
    [step.left, step.right].reduce((inner, ingred) =>
      ingred.parts.reduce((lvl, part) => Math.max(lvl, part.lvl || 0), inner), peak), 0);
}

@Component({
  selector: 'app-recipe-chain',
  imports: [CommonModule, RouterModule, OwnedStarComponent],
  template: `
    <ng-template #slot let-ingred let-op="op">
      <div class="line">
        <span class="op" [class.blank]="!op">{{ op }}</span>
        <span class="group" [class.multi]="ingred.parts.length > 1">
          @for (part of ingred.parts; track part.name; let last = $last) {
            <span class="side" [class.over]="outOfReach(part.lvl)">
              <app-owned-star [name]="part.name" [readonly]="true"></app-owned-star>
              <a class="demon" [routerLink]="[]" [queryParams]="{ target: part.name }"
                title="Build this one instead">{{ part.name }}</a>
              <span class="lvl">Lvl {{ part.lvl }}</span>
              @for (skill of part.skills; track skill) {
                <span class="chip">{{ skill }}</span>
              }
            </span>
            @if (!last) { <span class="plus">+</span> }
          }
        </span>
      </div>
    </ng-template>

    @if (!steps().length) {
      <p class="empty">{{ emptyText() }}</p>
    } @else {
      <ol class="chain">
        @for (step of steps(); track step.step) {
          <li class="step">
            <div class="step-head">
              <span class="num">{{ step.step }}</span>
              @if (recipeOf(step); as recipe) {
                <button type="button"
                  [ngClass]="['plan-btn', planned(recipe) ? 'on' : '']"
                  [title]="planned(recipe) ? 'Forget this plan' : 'Save this step to my plans'"
                  (click)="togglePlan(recipe)">&#9873;</button>
              } @else {
                <span class="plan-gap"></span>
              }
              <span class="step-label">Step {{ step.step }}</span>
            </div>

            <div class="step-body">
              <ng-container *ngTemplateOutlet="slot; context: { $implicit: step.left }"></ng-container>
              <ng-container *ngTemplateOutlet="slot; context: { $implicit: step.right, op: '\\u00d7' }"></ng-container>

              <div class="line makes">
                <span class="op arrow">&rarr;</span>
                <span class="group">
                  @for (part of step.result.parts; track part.name) {
                    <span class="side">
                      <a class="demon" [routerLink]="[]" [queryParams]="{ target: part.name }"
                        title="Build this one instead">{{ part.name }}</a>
                      <span class="lvl">Lvl {{ part.lvl }}</span>
                    </span>
                  }
                </span>
              </div>
            </div>
          </li>
        }
      </ol>
      @if (peakLvl() && outOfReach(peakLvl())) {
        <p class="warn">Needs a level {{ peakLvl() }} ingredient &mdash; you are level {{ playerLvl() }}.</p>
      }
    }
  `,
  styles: [`
    .chain { margin: 0; padding: 0; list-style: none; }

    /* One block per step, with room to breathe: the old single line wrapped
       badly as soon as a demon carried skills. */
    .step {
      margin-bottom: 0.6em;
      background-color: #222222;
      border: solid 1px #333333;
      border-radius: 4px;
    }
    .step:last-child { margin-bottom: 0; }

    .step-head {
      display: flex;
      align-items: center;
      gap: 0.4em;
      padding: 0.3em 0.5em;
      background-color: #1b1b1b;
      border-bottom: solid 1px #333333;
      border-radius: 3px 3px 0 0;
    }
    .step-label { color: #888888; font-size: 0.8em; letter-spacing: 0.04em; }
    .num {
      flex: 0 0 1.6em;
      height: 1.6em;
      line-height: 1.6em;
      text-align: center;
      color: #aaaaaa;
      background-color: #2c2c2c;
      border-radius: 50%;
      font-size: 0.8em;
    }

    .step-body { padding: 0.4em 0.5em; }

    .line {
      display: flex;
      align-items: baseline;
      gap: 0.4em;
      padding: 0.15em 0;
    }
    .line.makes {
      margin-top: 0.35em;
      padding-top: 0.45em;
      border-top: solid 1px #2c2c2c;
    }

    .op { flex: 0 0 1em; color: #888888; text-align: center; }
    .op.blank { color: transparent; }
    .op.arrow { color: #66BBFF; }

    .group { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.3em; }
    /* A slot holding more than one demon is bracketed so the extra demons are
       not mistaken for a separate fusion step. */
    .group.multi {
      padding: 0 0.35em;
      border-left: solid 2px #444444;
      border-right: solid 2px #444444;
      border-radius: 3px;
    }
    .side { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.25em; }

    .demon { font-weight: bold; }
    a.demon { color: white; text-decoration: none; border-bottom: dotted 1px #555555; }
    a.demon:hover { color: #66BBFF; border-bottom-color: #66BBFF; }
    .makes a.demon { color: #9edc9e; }
    .makes a.demon:hover { color: #66BBFF; }

    .lvl { color: #aaaaaa; font-size: 0.85em; }
    .side.over .demon, .side.over .lvl { color: #ff7070; }
    .plus { color: #888888; font-size: 0.85em; }

    .chip {
      padding: 0.05em 0.4em;
      color: #cccccc;
      background-color: #2c2c2c;
      border-radius: 999px;
      font-size: 0.8em;
      white-space: nowrap;
    }

    .plan-btn, .plan-gap {
      flex: 0 0 1.2em;
      width: 1.2em;
      padding: 0;
      background: none;
      border: 0;
      color: #555555;
      cursor: pointer;
      font-size: 1.05em;
      text-align: center;
    }
    .plan-btn.on { color: #66BBFF; }
    .plan-btn:hover { color: yellow; }

    .empty { margin: 0; padding: 1em; text-align: center; color: #888888; }
    .warn {
      margin: 0;
      padding: 0.5em;
      color: #ff7070;
      font-size: 0.85em;
      text-align: center;
    }
  `]
})
export class RecipeChainComponent {
  private playerState = inject(PlayerStateService);

  steps = input<RecipeStep[]>([]);
  emptyText = input('No recipes found');

  playerLvl = this.playerState.lvl$;
  peakLvl = computed(() => chainPeakLvl(this.steps()));

  recipeOf(step: RecipeStep): SavedRecipe {
    return stepRecipe(step);
  }

  planned(recipe: SavedRecipe): boolean {
    return this.playerState.hasRecipe(recipe);
  }

  togglePlan(recipe: SavedRecipe) {
    this.playerState.toggleRecipe(recipe);
  }

  outOfReach(lvl: number): boolean {
    const mine = this.playerLvl();
    return !!mine && !!lvl && lvl > mine;
  }
}
