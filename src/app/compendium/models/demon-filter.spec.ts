import { Demon, Skill } from '../models';
import { parseQuery } from '../../shared/search/query-parser';
import { compileDemonFilter, resistCode } from './demon-filter';

const STAT_HEADERS = ['St', 'Ma', 'Vi', 'Ag', 'Lu'];
const RESIST_HEADERS = ['phy', 'fir', 'ice', 'ele', 'for', 'lig', 'dar'];

const WEAK = 6 << 10;
const NORMAL = 5 << 10;
const NULL = 3 << 10;
const DRAIN = 1 << 10;

function makeDemon(overrides: Partial<Demon>): Demon {
  const demon: Demon = {
    race: 'Fairy', lvl: 12, currLvl: 12, name: 'Pixie', price: 500, inherits: 0,
    stats: [10, 20, 12, 18, 9],
    resists: [NORMAL, WEAK, NORMAL, NULL, NORMAL, NORMAL, DRAIN],
    fusion: 'normal', skills: { Zio: 0, Dia: 8 }, searchTags: ''
  };

  const result = Object.assign(demon, overrides);
  result.searchTags = [result.name, result.race, result.drop].filter(p => p).join(',').toLocaleLowerCase();
  return result;
}

const SKILL_ELEMS: { [name: string]: string } = {
  Zio: 'ele', Dia: 'rec', Thunder: 'ele', Agi: 'fir'
};

function filter(query: string, demons: Demon[]): string[] {
  const compiled = compileDemonFilter(parseQuery(query), {
    statHeaders: STAT_HEADERS,
    resistHeaders: RESIST_HEADERS,
    owned: new Set(['Pixie']),
    getSkill: name => ({ name, element: SKILL_ELEMS[name] } as Skill)
  });
  return demons.filter(compiled.predicate).map(d => d.name);
}

const PIXIE = makeDemon({});
const JACK = makeDemon({ name: 'Jack Frost', race: 'Fairy', lvl: 17, stats: [14, 22, 15, 14, 11] });
const ODIN = makeDemon({
  name: 'Odin', race: 'Deity', lvl: 78, stats: [55, 48, 50, 44, 40],
  resists: [NULL, NORMAL, NORMAL, WEAK, NORMAL, NORMAL, NORMAL],
  skills: { Thunder: 0 }
});
const ALL = [PIXIE, JACK, ODIN];

describe('resistCode', () => {
  it('decodes the packed resistance level', () => {
    expect(resistCode(WEAK)).toBe('wk');
    expect(resistCode(NULL)).toBe('nu');
    expect(resistCode(DRAIN)).toBe('ab');
  });

  it('decodes the multiplier-based encodings to the same codes', () => {
    expect(resistCode((14 << 10) | 120)).toBe('wk');
    expect(resistCode((12 << 10) | 20)).toBe('rs');
  });
});

describe('compileDemonFilter', () => {
  it('matches every demon for an empty query', () => {
    expect(filter('', ALL)).toEqual(['Pixie', 'Jack Frost', 'Odin']);
  });

  it('requires all free-text words to match, in any order', () => {
    expect(filter('jack frost', ALL)).toEqual(['Jack Frost']);
    expect(filter('frost jack', ALL)).toEqual(['Jack Frost']);
    expect(filter('jack odin', ALL)).toEqual([]);
  });

  it('filters by race, including alternatives', () => {
    expect(filter('race:fairy', ALL)).toEqual(['Pixie', 'Jack Frost']);
    expect(filter('race:fairy|deity', ALL)).toEqual(['Pixie', 'Jack Frost', 'Odin']);
  });

  it('filters by level range and comparators', () => {
    expect(filter('lvl:12-20', ALL)).toEqual(['Pixie', 'Jack Frost']);
    expect(filter('lvl:>20', ALL)).toEqual(['Odin']);
    expect(filter('lvl:17', ALL)).toEqual(['Jack Frost']);
  });

  it('reads the displayed level out of two-part level encodings', () => {
    const banded = makeDemon({ name: 'Banded', lvl: (30 << 10) | 5 });
    expect(filter('lvl:30', [banded])).toEqual(['Banded']);
  });

  it('filters by resistance, accepting full element names', () => {
    expect(filter('weak:fire', ALL)).toEqual(['Pixie', 'Jack Frost']);
    expect(filter('weak:elec', ALL)).toEqual(['Odin']);
    expect(filter('nu:elec', ALL)).toEqual(['Pixie', 'Jack Frost']);
    expect(filter('ab:dark', ALL)).toEqual(['Pixie', 'Jack Frost']);
  });

  it('supports grouped resistance filters', () => {
    expect(filter('immune:phy', ALL)).toEqual(['Odin']);
    expect(filter('strong:elec', ALL)).toEqual(['Pixie', 'Jack Frost']);
  });

  it('filters by learned skill', () => {
    expect(filter('skill:zio', ALL)).toEqual(['Pixie', 'Jack Frost']);
    expect(filter('skill:thunder', ALL)).toEqual(['Odin']);
  });

  it('filters by stat using the configured stat headers', () => {
    expect(filter('st:>50', ALL)).toEqual(['Odin']);
    expect(filter('ma:20-25', ALL)).toEqual(['Pixie', 'Jack Frost']);
  });

  it('excludes with negated terms', () => {
    expect(filter('-race:fairy', ALL)).toEqual(['Odin']);
    expect(filter('lvl:<80 -odin', ALL)).toEqual(['Pixie', 'Jack Frost']);
  });

  it('combines terms with AND', () => {
    expect(filter('race:fairy lvl:>15', ALL)).toEqual(['Jack Frost']);
  });

  it('filters by what the player owns', () => {
    expect(filter('have:yes', ALL)).toEqual(['Pixie']);
    expect(filter('have:no', ALL)).toEqual(['Jack Frost', 'Odin']);
    expect(filter('-have:yes', ALL)).toEqual(['Jack Frost', 'Odin']);
  });

  it('finds demons that could pass on a skill of an element', () => {
    expect(filter('inherit:elec', ALL)).toEqual(['Pixie', 'Jack Frost', 'Odin']);
    expect(filter('inherit:rec', ALL)).toEqual(['Pixie', 'Jack Frost']);
    expect(filter('inherit:fire', ALL)).toEqual([]);
  });

  it('excludes with a negated inherit', () => {
    expect(filter('-inherit:rec', ALL)).toEqual(['Odin']);
  });

  it('treats inherit as unknown when no skill lookup is wired up', () => {
    const compiled = compileDemonFilter(parseQuery('inherit:fire'), {
      statHeaders: STAT_HEADERS,
      resistHeaders: RESIST_HEADERS
    });

    expect(compiled.unknownTerms).toEqual(['inherit:fire']);
  });

  it('reports unknown terms instead of silently matching nothing', () => {
    const compiled = compileDemonFilter(parseQuery('bogus:thing lvl:>1'), {
      statHeaders: STAT_HEADERS,
      resistHeaders: RESIST_HEADERS
    });

    expect(compiled.unknownTerms).toEqual(['bogus:thing']);
    expect(ALL.filter(compiled.predicate).length).toBe(3);
  });

  it('treats an unknown element as an unknown term', () => {
    const compiled = compileDemonFilter(parseQuery('weak:bogus'), {
      statHeaders: STAT_HEADERS,
      resistHeaders: RESIST_HEADERS
    });

    expect(compiled.unknownTerms).toEqual(['weak:bogus']);
  });
});
