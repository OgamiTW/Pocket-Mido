import { Demon, FusionPair, Skill } from '../models';
import { parseQuery } from '../../shared/search/query-parser';
import { compileFusionFilter, FusionFilterConfig } from './fusion-filter';

const DEMON_SKILLS: { [name: string]: string[] } = {
  'Pixie': ['Agi', 'Dia'],
  'Jack Frost': ['Bufu'],
  'Odin': ['Ziodyne'],
  'Sudama': ['Zan'],
  'Koppa': ['Dia']
};

const SKILL_ELEMS: { [name: string]: string } = {
  Agi: 'fir', Bufu: 'ice', Ziodyne: 'ele', Zan: 'for', Dia: 'rec'
};

const CONFIG: FusionFilterConfig = {
  owned: new Set(['Pixie', 'Jack Frost']),
  getDemon: name => ({ name, skills: (DEMON_SKILLS[name] || [])
    .reduce((acc, s) => { acc[s] = 0; return acc; }, {}) } as unknown as Demon),
  getSkill: name => ({ name, element: SKILL_ELEMS[name] } as Skill)
};

function pair(name1: string, race1: string, lvl1: number,
              name2: string, race2: string, lvl2: number, price = 1000): FusionPair {
  return { price, race1, lvl1, name1, race2, lvl2, name2 };
}

const PAIRS = [
  pair('Pixie', 'Fairy', 12, 'Jack Frost', 'Fairy', 17, 800),
  pair('Odin', 'Deity', 78, 'Pixie', 'Fairy', 12, 9000),
  pair('Sudama', 'Jirae', 8, 'Koppa', 'Jirae', 5, 400)
];

function filter(query: string): string[] {
  const compiled = compileFusionFilter(parseQuery(query), CONFIG);
  return PAIRS.filter(compiled.predicate).map(p => `${p.name1}+${p.name2}`);
}

describe('compileFusionFilter', () => {
  it('keeps every recipe for an empty query', () => {
    expect(filter('').length).toBe(3);
  });

  it('matches free text against either ingredient', () => {
    expect(filter('pixie')).toEqual(['Pixie+Jack Frost', 'Odin+Pixie']);
    expect(filter('odin')).toEqual(['Odin+Pixie']);
  });

  it('requires every word to match somewhere in the recipe', () => {
    expect(filter('pixie jack')).toEqual(['Pixie+Jack Frost']);
    expect(filter('pixie sudama')).toEqual([]);
  });

  it('treats a level filter as a constraint on both ingredients', () => {
    expect(filter('lvl:<=20')).toEqual(['Pixie+Jack Frost', 'Sudama+Koppa']);
    expect(filter('lvl:<=10')).toEqual(['Sudama+Koppa']);
  });

  it('matches a race on either side', () => {
    expect(filter('race:fairy')).toEqual(['Pixie+Jack Frost', 'Odin+Pixie']);
    expect(filter('race:jirae')).toEqual(['Sudama+Koppa']);
  });

  it('pins a single side when asked', () => {
    expect(filter('name1:pixie')).toEqual(['Pixie+Jack Frost']);
    expect(filter('name2:pixie')).toEqual(['Odin+Pixie']);
    expect(filter('lvl2:<=5')).toEqual(['Sudama+Koppa']);
  });

  it('filters by price', () => {
    expect(filter('price:<1000')).toEqual(['Pixie+Jack Frost', 'Sudama+Koppa']);
  });

  it('excludes with negated terms', () => {
    expect(filter('-race:jirae')).toEqual(['Pixie+Jack Frost', 'Odin+Pixie']);
  });

  it('finds recipes whose ingredients know a named skill', () => {
    expect(filter('skill:bufu')).toEqual(['Pixie+Jack Frost']);
    expect(filter('skill:dia')).toEqual(['Pixie+Jack Frost', 'Odin+Pixie', 'Sudama+Koppa']);
  });

  it('finds recipes that bring an inheritable element', () => {
    expect(filter('inherit:fire')).toEqual(['Pixie+Jack Frost', 'Odin+Pixie']);
    expect(filter('inherit:ice')).toEqual(['Pixie+Jack Frost']);
    expect(filter('inherit:force')).toEqual(['Sudama+Koppa']);
  });

  it('finds recipes where both ingredients are owned', () => {
    expect(filter('have:yes')).toEqual(['Pixie+Jack Frost']);
    expect(filter('have:no')).toEqual(['Odin+Pixie', 'Sudama+Koppa']);
  });

  it('treats an inherit filter as unknown when no compendium is wired up', () => {
    const compiled = compileFusionFilter(parseQuery('inherit:fire'));
    expect(compiled.unknownTerms).toEqual(['inherit:fire']);
  });

  it('reports unknown terms rather than matching nothing', () => {
    const compiled = compileFusionFilter(parseQuery('bogus:x'), CONFIG);
    expect(compiled.unknownTerms).toEqual(['bogus:x']);
    expect(PAIRS.filter(compiled.predicate).length).toBe(3);
  });
});
