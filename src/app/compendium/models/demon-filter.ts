import { Demon, Skill } from '../models';
import { elemMatches } from './element-match';
import {
  CompiledFilter, MATCH_ALL, ParsedQuery, QueryTerm,
  describeTerm, isNumericTerm, matchesNumber, matchesText
} from '../../shared/search/query-parser';

const RESIST_CODES = [
  '?', 'ab', 'rp', 'nu', 'rs', 'no', 'wk', 'fr',
  '?', 'ab', 'rp', 'nu', 'rs', 'no', 'wk', 'fr'
];

const RESIST_FIELDS: { [field: string]: string[] } = {
  wk: ['wk'], weak: ['wk'], weakness: ['wk'],
  nu: ['nu'], null: ['nu'], nul: ['nu'], block: ['nu'],
  rs: ['rs'], resist: ['rs'], resists: ['rs'],
  rp: ['rp'], repel: ['rp'], reflect: ['rp'],
  ab: ['ab'], drain: ['ab'], absorb: ['ab'],
  no: ['no'], normal: ['no'], neutral: ['no'],
  strong: ['rs', 'nu', 'rp', 'ab'],
  immune: ['nu', 'rp', 'ab']
};

const TEXT_FIELDS: { [field: string]: (demon: Demon) => string } = {
  name: d => d.name,
  race: d => d.race,
  align: d => d.align,
  alignment: d => d.align,
  drop: d => d.drop,
  area: d => d.area,
  fusion: d => d.fusion,
  prereq: d => d.prereq
};

const NUMBER_FIELDS: { [field: string]: (demon: Demon) => number } = {
  lvl: demonLvl,
  level: demonLvl,
  price: d => d.price,
  cost: d => d.price,
  inherit: d => d.inherits,
  inherits: d => d.inherits
};

export interface DemonFilterConfig {
  statHeaders?: string[];
  resistHeaders?: string[];
  owned?: Set<string>;
  getSkill?: (name: string) => Skill;
}

const NEGATIVE_WORDS = ['no', 'false', '0', 'n', 'off'];

export function wantsTruthy(value: string): boolean {
  return NEGATIVE_WORDS.indexOf(value) === -1;
}

export function singleResistCode(field: string): string {
  const codes = RESIST_FIELDS[field];
  return codes && codes.length === 1 ? codes[0] : '';
}

export function resistCode(value: number): string {
  return RESIST_CODES[value >> 10] || '?';
}

// Levels above 0x3FF pack a second number in the low bits; the displayed
// level is the high half.
export function displayLvl(lvl: number): number {
  const floored = Math.floor(lvl);
  return floored <= 0x3FF ? floored : floored >> 10;
}

export function demonLvl(demon: Demon): number {
  return displayLvl(demon.lvl);
}

function textTest(term: QueryTerm, get: (demon: Demon) => string): (demon: Demon) => boolean {
  return demon => matchesText(term, get(demon) || '') !== term.negated;
}

function numberTest(term: QueryTerm, get: (demon: Demon) => number): (demon: Demon) => boolean {
  return demon => matchesNumber(term, get(demon)) !== term.negated;
}

function resistTest(term: QueryTerm, codes: string[], resistHeaders: string[]): (demon: Demon) => boolean {
  const indices = resistHeaders
    .map((header, index) => ({ header, index }))
    .filter(pair => elemMatches(pair.header, term.alts))
    .map(pair => pair.index);

  if (!indices.length) { return null; }

  return demon => indices.some(i => codes.includes(resistCode(demon.resists[i]))) !== term.negated;
}

function skillTest(term: QueryTerm): (demon: Demon) => boolean {
  return demon => Object.keys(demon.skills || {})
    .some(skill => matchesText(term, skill)) !== term.negated;
}

function makeTermTest(term: QueryTerm, config: DemonFilterConfig): (demon: Demon) => boolean {
  const statHeaders = config.statHeaders || [];
  const resistHeaders = config.resistHeaders || [];

  if (!term.field) {
    return textTest(term, d => d.searchTags);
  }

  // "Who can pass me a fire skill?" - the same question inherit: answers on the
  // recipe tables. The numeric form below still means the inheritance bitmask.
  if (term.field === 'inherit' && !isNumericTerm(term)) {
    const getSkill = config.getSkill;

    if (!getSkill) { return null; }

    return demon => Object.keys(demon.skills || {}).some(name => {
      const skill = getSkill(name);
      return skill && elemMatches(skill.element, term.alts);
    }) !== term.negated;
  }

  if (TEXT_FIELDS[term.field]) {
    return isNumericTerm(term) ? null : textTest(term, TEXT_FIELDS[term.field]);
  }

  if (NUMBER_FIELDS[term.field]) {
    return isNumericTerm(term) ? numberTest(term, NUMBER_FIELDS[term.field]) : null;
  }

  if (term.field === 'skill' || term.field === 'skills') {
    return isNumericTerm(term) ? null : skillTest(term);
  }

  if (term.field === 'have' || term.field === 'own' || term.field === 'owned') {
    if (isNumericTerm(term)) { return null; }

    const owned = config.owned || new Set<string>();
    const wanted = wantsTruthy(term.alts[0]);

    return demon => (owned.has(demon.name) === wanted) !== term.negated;
  }

  if (RESIST_FIELDS[term.field]) {
    return isNumericTerm(term) ? null : resistTest(term, RESIST_FIELDS[term.field], resistHeaders);
  }

  const statIndex = statHeaders.findIndex(stat => stat.toLocaleLowerCase() === term.field);

  if (statIndex !== -1) {
    return isNumericTerm(term) ? numberTest(term, d => d.stats[statIndex]) : null;
  }

  return null;
}

export function compileDemonFilter(query: ParsedQuery, config: DemonFilterConfig): CompiledFilter<Demon> {
  if (query.isEmpty) { return MATCH_ALL; }

  const tests: ((demon: Demon) => boolean)[] = [];
  const unknownTerms: string[] = [];

  for (const term of query.terms) {
    const test = makeTermTest(term, config);

    if (test) { tests.push(test); } else { unknownTerms.push(describeTerm(term)); }
  }

  if (!tests.length) { return { predicate: () => true, unknownTerms }; }

  return { predicate: demon => tests.every(test => test(demon)), unknownTerms };
}

export function demonFilterHints(config: DemonFilterConfig): { syntax: string, desc: string }[] {
  const stats = (config.statHeaders || []).map(stat => stat.toLocaleLowerCase());
  const hints = [
    { syntax: 'jack frost', desc: 'All words must match name, race, drop or area' },
    { syntax: '"dark hero"', desc: 'Quote a phrase to match it exactly' },
    { syntax: 'race:fairy|jirae', desc: 'Use | for alternatives' },
    { syntax: 'lvl:20-40', desc: 'Numeric range; also lvl:>30, lvl:<=50, lvl:42' },
    { syntax: 'weak:fire', desc: 'Also nu:, rs:, rp:, ab:, strong:, immune:' },
    { syntax: 'skill:agi', desc: 'Learns a skill whose name matches' },
    { syntax: '-race:fiend', desc: 'Prefix with - to exclude' },
    { syntax: 'have:yes', desc: 'Only demons you marked as owned (have:no for the rest)' },
    { syntax: 'inherit:fire', desc: 'Knows a skill of that element, to pass on in a fusion' }
  ];

  if (stats.length) {
    hints.push({ syntax: stats[0] + ':>30', desc: 'Stat filters: ' + stats.join(', ') });
  }

  return hints;
}
