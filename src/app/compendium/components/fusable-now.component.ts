import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NamePair } from '../models';
import { PlayerStateService } from '../../shared/player/player-state.service';
import { FUSION_DATA_SERVICE } from '../constants';
import { displayLvl } from '../models/demon-filter';
import { OwnedStarComponent } from './owned-star.component';

export interface FusableRecipe {
  a: string;
  aLvl: number;
  b: string;
  bLvl: number;
  result: string;
  resultLvl: number;
}

export interface FusableLookup {
  // Forward direction: for a demon, the pairs of (partner, result).
  getFusions: (name: string) => NamePair[];
  getLvl: (name: string) => number;
}

// Crosses the demons you have starred with what they fuse into, so the answer
// to "what can I make right now" does not have to be worked out by hand.
export function findFusable(owned: string[], lookup: FusableLookup): FusableRecipe[] {
  const have = new Set(owned);
  const seen = new Set<string>();
  const found: FusableRecipe[] = [];

  for (const name of owned) {
    for (const pair of lookup.getFusions(name) || []) {
      const partner = pair.name1;
      const result = pair.name2;

      if (!have.has(partner) || partner === name) { continue; }

      // A x B and B x A are the same recipe.
      const key = [name, partner].sort().join('|');

      if (seen.has(key)) { continue; }

      seen.add(key);
      found.push({
        a: name, aLvl: lookup.getLvl(name),
        b: partner, bLvl: lookup.getLvl(partner),
        result, resultLvl: lookup.getLvl(result)
      });
    }
  }

  return found.sort((x, y) => y.resultLvl - x.resultLvl || x.result.localeCompare(y.result));
}

@Component({
  selector: 'app-fusable-now',
  imports: [CommonModule, RouterModule, OwnedStarComponent],
  template: `
    <table class="entry-table fusable">
      <thead>
        <tr>
          <th colspan="4" class="title">
            What I can fuse now
            <span class="count">{{ recipes().length }} from {{ ownedCount() }} starred</span>
          </th>
        </tr>
      </thead>
      <tbody>
        @if (!ownedCount()) {
          <tr>
            <td colspan="4" class="empty">
              Star the demons you have, using the star beside each name, and the fusions
              they make will show up here.
            </td>
          </tr>
        } @else if (!recipes().length) {
          <tr>
            <td colspan="4" class="empty">
              Nothing fuses out of the {{ ownedCount() }} demons you have starred yet.
            </td>
          </tr>
        }
        @for (recipe of recipes(); track recipe.a + recipe.b) {
          <tr>
            <td class="ingredient">
              <a [routerLink]="['../demons', recipe.a]">{{ recipe.a }}</a>
              <span class="lvl">Lvl {{ recipe.aLvl }}</span>
            </td>
            <td class="op">&times;</td>
            <td class="ingredient">
              <a [routerLink]="['../demons', recipe.b]">{{ recipe.b }}</a>
              <span class="lvl">Lvl {{ recipe.bLvl }}</span>
            </td>
            <td class="result">
              <span class="op arrow">&rarr;</span>
              <app-owned-star [name]="recipe.result"></app-owned-star>
              <a [routerLink]="['../demons', recipe.result]">{{ recipe.result }}</a>
              <span class="lvl">Lvl {{ recipe.resultLvl }}</span>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    .fusable { width: 100%; }
    .title .count { float: right; color: #aaaaaa; font-weight: normal; font-size: 0.85em; }
    .fusable td { padding: 0.25em 0.5em; }
    .ingredient, .result { display: flex; align-items: baseline; gap: 0.3em; }
    .lvl { color: #aaaaaa; font-size: 0.85em; }
    .op { color: #888888; text-align: center; }
    .op.arrow { color: #66BBFF; }
    .result a { color: #9edc9e; }
    .empty { color: #888888; padding: 0.9em; text-align: center; }
  `]
})
export class FusableNowComponent {
  private playerState = inject(PlayerStateService);
  private fusionData = inject(FUSION_DATA_SERVICE, { optional: true });

  lang = input('en');

  ownedCount = computed(() => this.playerState.owned$().size);

  recipes = computed(() => {
    const owned = Array.from(this.playerState.owned$());

    if (!this.fusionData || !owned.length) { return []; }

    const compendium = this.fusionData.compendium$();
    const chart = this.fusionData.fusionChart$();
    const calculator = this.fusionData.fusionCalculator;

    return findFusable(owned, {
      getFusions: name => calculator.getFusions(name, compendium, chart),
      getLvl: name => {
        const demon = compendium.getDemon(name);
        return demon ? displayLvl(demon.lvl) : 0;
      }
    });
  });
}
