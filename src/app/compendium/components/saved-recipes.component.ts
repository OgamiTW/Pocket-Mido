import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PlayerStateService, SavedRecipe } from '../../shared/player/player-state.service';
import { FUSION_DATA_SERVICE } from '../constants';
import { displayLvl } from '../models/demon-filter';
import { OwnedStarComponent } from './owned-star.component';

export interface PlannedRecipe extends SavedRecipe {
  aLvl: number;
  bLvl: number;
  resultLvl: number;
  missing: string[];
  ready: boolean;
}

export function planRecipes(
  recipes: SavedRecipe[], owned: Set<string>, getLvl: (name: string) => number
): PlannedRecipe[] {
  return (recipes || []).map(recipe => {
    const missing = [recipe.a, recipe.b].filter(name => !owned.has(name));

    return Object.assign({}, recipe, {
      aLvl: getLvl(recipe.a),
      bLvl: getLvl(recipe.b),
      resultLvl: getLvl(recipe.result),
      missing,
      ready: missing.length === 0
    });
  // Ones you can make now first, then the ones missing the least.
  }).sort((x, y) => x.missing.length - y.missing.length || x.result.localeCompare(y.result));
}

// The recipes you bookmarked, with what you still need for each one.
@Component({
  selector: 'app-saved-recipes',
  imports: [CommonModule, RouterModule, OwnedStarComponent],
  template: `
    <table class="entry-table planned">
      <thead>
        <tr>
          <th colspan="3" class="title">
            My fusion plans
            @if (recipes().length) {
              <span class="count">{{ readyCount() }} of {{ recipes().length }} ready</span>
            }
          </th>
        </tr>
      </thead>
      <tbody>
        @if (!recipes().length) {
          <tr>
            <td colspan="3" class="empty">
              Nothing saved yet. Use the bookmark beside a recipe on a demon's fusion tab
              to keep it here.
            </td>
          </tr>
        }
        @for (recipe of recipes(); track recipe.result + recipe.a + recipe.b) {
          <tr [class.ready]="recipe.ready">
            <td class="mark">
              <button type="button" class="drop" title="Forget this plan"
                (click)="forget(recipe)">&#10005;</button>
            </td>
            <td class="recipe">
              <span class="side" [class.missing]="isMissing(recipe, recipe.a)">
                <a [routerLink]="['../demons', recipe.a]">{{ recipe.a }}</a>
                <span class="lvl">Lvl {{ recipe.aLvl }}</span>
              </span>
              <span class="op">&times;</span>
              <span class="side" [class.missing]="isMissing(recipe, recipe.b)">
                <a [routerLink]="['../demons', recipe.b]">{{ recipe.b }}</a>
                <span class="lvl">Lvl {{ recipe.bLvl }}</span>
              </span>
              <span class="op arrow">&rarr;</span>
              <span class="side">
                <app-owned-star [name]="recipe.result"></app-owned-star>
                <a class="result" [routerLink]="['../demons', recipe.result]">{{ recipe.result }}</a>
                <span class="lvl">Lvl {{ recipe.resultLvl }}</span>
              </span>
            </td>
            <td class="status">
              @if (recipe.ready) {
                <span class="ok">ready</span>
              } @else {
                <span class="need">need {{ recipe.missing.join(', ') }}</span>
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    .planned { width: 100%; }
    .title .count { float: right; color: #aaaaaa; font-weight: normal; font-size: 0.85em; }
    .planned td { padding: 0.25em 0.5em; }
    .planned td.mark { width: 2em; text-align: center; }
    .recipe { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.3em; }
    .side { display: flex; align-items: baseline; gap: 0.25em; }
    .side.missing a { color: #ff9c9c; }
    .lvl { color: #aaaaaa; font-size: 0.85em; }
    .op { color: #888888; }
    .op.arrow { color: #66BBFF; }
    a.result { color: #9edc9e; }
    .status { width: 14em; text-align: right; font-size: 0.85em; }
    .status .ok { color: #9edc9e; }
    .status .need { color: #ffcc66; }
    tr.ready td { background-color: #1f2d1f; }
    .drop {
      color: #888888;
      background: none;
      border: 0;
      cursor: pointer;
      font: inherit;
    }
    .drop:hover { color: #ff7070; }
    .empty { color: #888888; padding: 0.9em; text-align: center; }
  `]
})
export class SavedRecipesComponent {
  private playerState = inject(PlayerStateService);
  private fusionData = inject(FUSION_DATA_SERVICE, { optional: true });

  lang = input('en');

  recipes = computed(() => {
    const compendium = this.fusionData ? this.fusionData.compendium$() : null;

    return planRecipes(this.playerState.recipes$(), this.playerState.owned$(), name => {
      const demon = compendium ? compendium.getDemon(name) : null;
      return demon ? displayLvl(demon.lvl) : 0;
    });
  });

  readyCount = computed(() => this.recipes().filter(recipe => recipe.ready).length);

  isMissing(recipe: PlannedRecipe, name: string): boolean {
    return recipe.missing.indexOf(name) !== -1;
  }

  forget(recipe: PlannedRecipe) {
    this.playerState.toggleRecipe({ a: recipe.a, b: recipe.b, result: recipe.result });
  }
}
