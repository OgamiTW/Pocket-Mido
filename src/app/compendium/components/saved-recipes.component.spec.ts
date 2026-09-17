import { SavedRecipe, parseRecipeKey, recipeKey } from '../../shared/player/player-state.service';
import { planRecipes } from './saved-recipes.component';

const LVLS = { Pixie: 12, 'Jack Frost': 17, Sudama: 8, Odin: 78, Efreet: 45 };
const getLvl = (name: string) => LVLS[name] || 0;

const SUDAMA: SavedRecipe = { a: 'Pixie', b: 'Jack Frost', result: 'Sudama' };
const EFREET: SavedRecipe = { a: 'Pixie', b: 'Odin', result: 'Efreet' };

describe('recipeKey', () => {
  it('round trips', () => {
    expect(parseRecipeKey(recipeKey(SUDAMA))).toEqual({
      a: 'Jack Frost', b: 'Pixie', result: 'Sudama'
    });
  });

  it('gives the same key whichever way round the ingredients are', () => {
    expect(recipeKey({ a: 'Pixie', b: 'Jack Frost', result: 'Sudama' }))
      .toBe(recipeKey({ a: 'Jack Frost', b: 'Pixie', result: 'Sudama' }));
  });

  it('rejects a malformed key', () => {
    expect(parseRecipeKey('')).toBeNull();
    expect(parseRecipeKey('just-one-name')).toBeNull();
    expect(parseRecipeKey(null)).toBeNull();
  });
});

describe('planRecipes', () => {
  it('handles having saved nothing', () => {
    expect(planRecipes([], new Set(), getLvl)).toEqual([]);
    expect(planRecipes(null, new Set(), getLvl)).toEqual([]);
  });

  it('lists what is still missing', () => {
    const [plan] = planRecipes([SUDAMA], new Set(['Pixie']), getLvl);

    expect(plan.missing).toEqual(['Jack Frost']);
    expect(plan.ready).toBe(false);
  });

  it('is ready once you have both', () => {
    const [plan] = planRecipes([SUDAMA], new Set(['Pixie', 'Jack Frost']), getLvl);

    expect(plan.missing).toEqual([]);
    expect(plan.ready).toBe(true);
  });

  it('counts both as missing when you have neither', () => {
    const [plan] = planRecipes([SUDAMA], new Set(), getLvl);
    expect(plan.missing).toEqual(['Pixie', 'Jack Frost']);
  });

  it('carries the levels of everyone involved', () => {
    const [plan] = planRecipes([SUDAMA], new Set(), getLvl);

    expect(plan).toMatchObject({ aLvl: 12, bLvl: 17, resultLvl: 8 });
  });

  it('puts the ones you can make now first', () => {
    const plans = planRecipes([EFREET, SUDAMA], new Set(['Pixie', 'Jack Frost']), getLvl);

    expect(plans.map(p => p.result)).toEqual(['Sudama', 'Efreet']);
    expect(plans[0].ready).toBe(true);
    expect(plans[1].ready).toBe(false);
  });

  it('does not mind a demon the compendium does not know', () => {
    const [plan] = planRecipes(
      [{ a: 'Ghost', b: 'Pixie', result: 'Mystery' }], new Set(['Pixie']), getLvl);

    expect(plan.aLvl).toBe(0);
    expect(plan.missing).toEqual(['Ghost']);
  });
});
