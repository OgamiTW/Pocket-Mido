import { Skill } from '../models';
import { elemMatches } from './element-match';
import {
  CompiledFilter, MATCH_ALL, ParsedQuery, QueryTerm,
  describeTerm, isNumericTerm, matchesNumber, matchesText
} from '../../shared/search/query-parser';

const TEXT_FIELDS: { [field: string]: (skill: Skill) => string } = {
  name: s => s.name,
  effect: s => s.effect,
  damage: s => s.damage,
  hits: s => s.hits,
  target: s => s.target,
  requires: s => s.requires
};

const NUMBER_FIELDS: { [field: string]: (skill: Skill) => number } = {
  cost: s => s.cost & 0x3FF,
  mp: s => s.cost & 0x3FF,
  rank: s => s.rank,
  lvl: s => s.level,
  level: s => s.level
};

function searchText(skill: Skill): string {
  return [skill.name, skill.effect, skill.damage].filter(part => part).join(' ');
}

function textTest(term: QueryTerm, get: (skill: Skill) => string): (skill: Skill) => boolean {
  return skill => matchesText(term, get(skill) || '') !== term.negated;
}

function numberTest(term: QueryTerm, get: (skill: Skill) => number): (skill: Skill) => boolean {
  return skill => matchesNumber(term, get(skill)) !== term.negated;
}

function elemTest(term: QueryTerm, get: (skill: Skill) => string): (skill: Skill) => boolean {
  return skill => elemMatches(get(skill), term.alts) !== term.negated;
}

function demonListTest(term: QueryTerm, get: (skill: Skill) => { demon: string }[]): (skill: Skill) => boolean {
  return skill => (get(skill) || [])
    .some(entry => matchesText(term, entry.demon)) !== term.negated;
}

function makeTermTest(term: QueryTerm): (skill: Skill) => boolean {
  if (!term.field) {
    return isNumericTerm(term) ? null : textTest(term, searchText);
  }

  if (TEXT_FIELDS[term.field]) {
    return isNumericTerm(term) ? null : textTest(term, TEXT_FIELDS[term.field]);
  }

  if (NUMBER_FIELDS[term.field]) {
    return isNumericTerm(term) ? numberTest(term, NUMBER_FIELDS[term.field]) : null;
  }

  if (term.field === 'elem' || term.field === 'element') {
    return isNumericTerm(term) ? null : elemTest(term, s => s.element);
  }

  if (term.field === 'inherit') {
    return isNumericTerm(term) ? null : elemTest(term, s => s.inherit);
  }

  if (term.field === 'by' || term.field === 'learned' || term.field === 'demon') {
    return isNumericTerm(term) ? null : demonListTest(term, s => s.learnedBy);
  }

  if (term.field === 'transfer' || term.field === 'card') {
    return isNumericTerm(term) ? null : demonListTest(term, s => s.transfer);
  }

  return null;
}

export function compileSkillFilter(query: ParsedQuery): CompiledFilter<Skill> {
  if (query.isEmpty) { return MATCH_ALL; }

  const tests: ((skill: Skill) => boolean)[] = [];
  const unknownTerms: string[] = [];

  for (const term of query.terms) {
    const test = makeTermTest(term);

    if (test) { tests.push(test); } else { unknownTerms.push(describeTerm(term)); }
  }

  if (!tests.length) { return { predicate: () => true, unknownTerms }; }

  return { predicate: skill => tests.every(test => test(skill)), unknownTerms };
}

export const SKILL_FILTER_HINTS = [
  { syntax: 'mudo instant', desc: 'All words must match name, effect or damage' },
  { syntax: 'elem:fire', desc: 'Filter by element; also inherit:fire' },
  { syntax: 'cost:<=20', desc: 'Numeric; also cost:10-30, rank:>50, lvl:>=40' },
  { syntax: 'by:pixie', desc: 'Learned by a demon whose name matches' },
  { syntax: 'target:all', desc: 'Filter by target, damage, hits or requires' },
  { syntax: '-elem:phy', desc: 'Prefix with - to exclude' }
];
