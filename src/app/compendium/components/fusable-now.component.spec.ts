import { NamePair } from '../models';
import { findFusable } from './fusable-now.component';

// Forward direction: for a demon, the pairs of (partner, result).
const FUSIONS: { [demon: string]: NamePair[] } = {
  Pixie: [
    { name1: 'Jack Frost', name2: 'Sudama' },
    { name1: 'Odin', name2: 'Efreet' }
  ],
  'Jack Frost': [
    { name1: 'Pixie', name2: 'Sudama' }
  ],
  Odin: [
    { name1: 'Pixie', name2: 'Efreet' }
  ],
  Koppa: []
};

const LVLS = { Pixie: 12, 'Jack Frost': 17, Odin: 78, Sudama: 8, Efreet: 45, Koppa: 5 };

const LOOKUP = {
  getFusions: (name: string) => FUSIONS[name] || [],
  getLvl: (name: string) => LVLS[name] || 0
};

function results(owned: string[]): string[] {
  return findFusable(owned, LOOKUP).map(r => `${r.a}+${r.b}=${r.result}`);
}

describe('findFusable', () => {
  it('finds nothing with nothing starred', () => {
    expect(findFusable([], LOOKUP)).toEqual([]);
  });

  it('finds nothing when the partner is not starred', () => {
    expect(results(['Pixie'])).toEqual([]);
  });

  it('finds a recipe once both ingredients are starred', () => {
    expect(results(['Pixie', 'Jack Frost'])).toEqual(['Pixie+Jack Frost=Sudama']);
  });

  it('counts a pair once, not once from each side', () => {
    const found = findFusable(['Pixie', 'Jack Frost'], LOOKUP);
    expect(found.length).toBe(1);
  });

  it('finds every pairing among what you have', () => {
    const found = results(['Pixie', 'Jack Frost', 'Odin']);

    expect(found.length).toBe(2);
    expect(found).toContain('Pixie+Jack Frost=Sudama');
    expect(found).toContain('Pixie+Odin=Efreet');
  });

  it('carries the levels of both ingredients and the result', () => {
    const [recipe] = findFusable(['Pixie', 'Jack Frost'], LOOKUP);

    expect(recipe).toMatchObject({
      a: 'Pixie', aLvl: 12,
      b: 'Jack Frost', bLvl: 17,
      result: 'Sudama', resultLvl: 8
    });
  });

  it('puts the highest level results first', () => {
    const found = findFusable(['Pixie', 'Jack Frost', 'Odin'], LOOKUP);
    expect(found.map(r => r.result)).toEqual(['Efreet', 'Sudama']);
  });

  it('ignores a demon that fuses with nothing', () => {
    expect(results(['Koppa', 'Pixie'])).toEqual([]);
  });

  it('never pairs a demon with itself', () => {
    const selfish = {
      getFusions: () => [{ name1: 'Pixie', name2: 'Pixie' }],
      getLvl: (name: string) => LVLS[name] || 0
    };

    expect(findFusable(['Pixie'], selfish)).toEqual([]);
  });
});
