import { Demon, FusionTrio } from '../models';
import { trioText } from './fusion-trio-table.component';

function demon(name: string, race: string): Demon {
  return {
    race, lvl: 1, currLvl: 1, name, price: 0, inherits: 0, stats: [], resists: [],
    fusion: 'normal', skills: {}, searchTags: ''
  };
}

const TRIO: FusionTrio = {
  demon: demon('Shiva', 'Fury'),
  minPrice: 1000,
  fusions: [
    { d1: demon('Pixie', 'Fairy'), d2: demon('Odin', 'Deity'), d3: demon('Sudama', 'Jirae'), price: 1000 }
  ]
};

describe('trioText', () => {
  it('covers the demon it makes and every ingredient', () => {
    const text = trioText(TRIO);

    expect(text).toContain('Shiva');
    expect(text).toContain('Pixie');
    expect(text).toContain('Odin');
    expect(text).toContain('Sudama');
  });

  it('covers races too', () => {
    const text = trioText(TRIO);

    expect(text).toContain('Fury');
    expect(text).toContain('Jirae');
  });

  it('copes with a trio that has no fusions listed', () => {
    expect(trioText({ demon: demon('Shiva', 'Fury'), minPrice: 0, fusions: [] }))
      .toBe('Shiva Fury');
  });

  it('copes with missing pieces', () => {
    expect(trioText({ demon: null, minPrice: 0, fusions: null } as any)).toBe('');
  });
});
