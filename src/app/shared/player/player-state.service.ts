import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { gameKey } from '../game-key';

const STORAGE_PREFIX = 'megaten-fusion-tool.player';

interface PlayerSave {
  lvl: number;
  owned: string[];
  recent: string[];
  recipes: string[];
}

const EMPTY_SAVE: PlayerSave = { lvl: 0, owned: [], recent: [], recipes: [] };
const MAX_RECENT = 12;

export interface SavedRecipe {
  a: string;
  b: string;
  result: string;
}

// Stored as one string so the whole save stays a plain list of strings.
export function recipeKey(recipe: SavedRecipe): string {
  const [a, b] = [recipe.a, recipe.b].sort();
  return [a, b, recipe.result].join('|');
}

export function parseRecipeKey(key: string): SavedRecipe {
  const [a, b, result] = (key || '').split('|');
  return a && b && result ? { a, b, result } : null;
}

// Per-game state the tool keeps for the person using it: the level they are
// playing at, and which demons they already have. Both drive filters and the
// "can I fuse this yet" shading, so they live in one place.
@Injectable({ providedIn: 'root' })
export class PlayerStateService {
  private router = inject(Router);
  private save$ = signal<PlayerSave>(EMPTY_SAVE);
  private game = '';

  lvl$ = computed(() => this.save$().lvl);
  owned$ = computed(() => new Set(this.save$().owned));
  ownedCount$ = computed(() => this.save$().owned.length);
  recent$ = computed(() => this.save$().recent);
  recipeKeys$ = computed(() => this.save$().recipes);
  recipes$ = computed(() => this.save$().recipes
    .map(parseRecipeKey)
    .filter(recipe => !!recipe));

  constructor() {
    this.reload();
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) { this.reload(); }
    });
  }

  setLvl(lvl: number) {
    this.commit({ lvl: Number.isFinite(lvl) && lvl > 0 ? Math.floor(lvl) : 0 });
  }

  isOwned(name: string): boolean {
    return this.owned$().has(name);
  }

  toggleOwned(name: string) {
    const owned = this.owned$();

    if (owned.has(name)) { owned.delete(name); } else { owned.add(name); }

    this.commit({ owned: Array.from(owned).sort() });
  }

  clearOwned() {
    this.commit({ owned: [] });
  }

  // Most recently opened first, without duplicates.
  visit(name: string) {
    if (!name || name === '-') { return; }

    const recent = this.save$().recent;

    if (recent[0] === name) { return; }

    this.commit({ recent: [name].concat(recent.filter(n => n !== name)).slice(0, MAX_RECENT) });
  }

  clearRecent() {
    this.commit({ recent: [] });
  }

  hasRecipe(recipe: SavedRecipe): boolean {
    return this.save$().recipes.indexOf(recipeKey(recipe)) !== -1;
  }

  toggleRecipe(recipe: SavedRecipe) {
    const key = recipeKey(recipe);
    const recipes = this.save$().recipes;

    this.commit({
      recipes: recipes.indexOf(key) === -1
        ? recipes.concat(key)
        : recipes.filter(saved => saved !== key)
    });
  }

  clearRecipes() {
    this.commit({ recipes: [] });
  }

  get save(): PlayerSave {
    return this.save$();
  }

  restore(save: Partial<PlayerSave>) {
    this.commit({
      lvl: typeof save.lvl === 'number' ? save.lvl : 0,
      owned: Array.isArray(save.owned) ? save.owned.filter(n => typeof n === 'string') : [],
      recent: Array.isArray(save.recent) ? save.recent.filter(n => typeof n === 'string') : [],
      recipes: Array.isArray(save.recipes) ? save.recipes.filter(n => typeof n === 'string') : []
    });
  }

  private commit(patch: Partial<PlayerSave>) {
    const next = Object.assign({}, this.save$(), patch);
    this.save$.set(next);

    try {
      localStorage.setItem(`${STORAGE_PREFIX}.${this.game}`, JSON.stringify(next));
    } catch {
      return;
    }
  }

  private reload() {
    const game = gameKey(this.router);

    if (game === this.game) { return; }

    this.game = game;
    this.save$.set(this.read(game));
  }

  private read(game: string): PlayerSave {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}.${game}`);

      if (!raw) { return EMPTY_SAVE; }

      const parsed = JSON.parse(raw);
      return {
        lvl: typeof parsed.lvl === 'number' ? parsed.lvl : 0,
        owned: Array.isArray(parsed.owned) ? parsed.owned.filter(n => typeof n === 'string') : [],
        recent: Array.isArray(parsed.recent) ? parsed.recent.filter(n => typeof n === 'string') : [],
        recipes: Array.isArray(parsed.recipes) ? parsed.recipes.filter(n => typeof n === 'string') : []
      };
    } catch {
      return EMPTY_SAVE;
    }
  }
}
