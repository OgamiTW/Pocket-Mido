import { Demon, FusionPair, Skill } from '../models';
import {
  CompiledFilter, MATCH_ALL, ParsedQuery, QueryTerm,
  describeTerm, isNumericTerm, matchesNumber, matchesText
} from '../../shared/search/query-parser';
import { displayLvl, wantsTruthy } from './demon-filter';
import { elemMatches } from './element-match';

export interface FusionFilterConfig {
  owned?: Set<string>;
  getDemon?: (name: string) => Demon;
  getSkill?: (name: string) => Skill;
}

function searchText(pair: FusionPair): string {
  return [pair.name1, pair.race1, pair.name2, pair.race2].filter(part => part).join(' ');
}

function eitherText(term: QueryTerm, get: (pair: FusionPair) => string[]): (pair: FusionPair) => boolean {
  return pair => get(pair).some(value => matchesText(term, value || '')) !== term.negated;
}

function sideText(term: QueryTerm, get: (pair: FusionPair) => string): (pair: FusionPair) => boolean {
  return pair => matchesText(term, get(pair) || '') !== term.negated;
}

function sideNumber(term: QueryTerm, get: (pair: FusionPair) => number): (pair: FusionPair) => boolean {
  return pair => matchesNumber(term, get(pair)) !== term.negated;
}

// A level filter is a constraint on the recipe, so both ingredients have to
// satisfy it: lvl:<=40 means "a recipe I can actually make at level 40".
function bothLvls(term: QueryTerm): (pair: FusionPair) => boolean {
  return pair => (
    matchesNumber(term, displayLvl(pair.lvl1)) && matchesNumber(term, displayLvl(pair.lvl2))
  ) !== term.negated;
}

function ingredientSkills(pair: FusionPair, config: FusionFilterConfig): string[] {
  const getDemon = config.getDemon;

  if (!getDemon) { return []; }

  return [pair.name1, pair.name2].reduce<string[]>((skills, name) => {
    const demon = getDemon(name);
    return demon && demon.skills ? skills.concat(Object.keys(demon.skills)) : skills;
  }, []);
}

function skillTest(term: QueryTerm, config: FusionFilterConfig): (pair: FusionPair) => boolean {
  return pair => ingredientSkills(pair, config)
    .some(skill => matchesText(term, skill)) !== term.negated;
}

// "Which of these recipes brings in a fire skill I could inherit?"
function inheritTest(term: QueryTerm, config: FusionFilterConfig): (pair: FusionPair) => boolean {
  const getSkill = config.getSkill;

  if (!getSkill) { return null; }

  return pair => ingredientSkills(pair, config).some(name => {
    const skill = getSkill(name);
    return skill && elemMatches(skill.element, term.alts);
  }) !== term.negated;
}

function ownedTest(term: QueryTerm, config: FusionFilterConfig): (pair: FusionPair) => boolean {
  const owned = config.owned || new Set<string>();
  const wanted = wantsTruthy(term.alts[0]);

  return pair => (
    (owned.has(pair.name1) && owned.has(pair.name2)) === wanted
  ) !== term.negated;
}

function makeTermTest(term: QueryTerm, config: FusionFilterConfig): (pair: FusionPair) => boolean {
  const numeric = isNumericTerm(term);

  switch (term.field) {
    case 'skill':
    case 'skills':  return numeric ? null : skillTest(term, config);
    case 'inherit':
    case 'elem':    return numeric ? null : inheritTest(term, config);
    case 'have':
    case 'own':
    case 'owned':   return numeric ? null : ownedTest(term, config);
  }

  switch (term.field) {
    case '':      return numeric ? null : sideText(term, searchText);
    case 'name':  return numeric ? null : eitherText(term, p => [p.name1, p.name2]);
    case 'race':  return numeric ? null : eitherText(term, p => [p.race1, p.race2]);
    case 'notes': return numeric ? null : sideText(term, p => p.notes);
    case 'name1': return numeric ? null : sideText(term, p => p.name1);
    case 'name2': return numeric ? null : sideText(term, p => p.name2);
    case 'race1': return numeric ? null : sideText(term, p => p.race1);
    case 'race2': return numeric ? null : sideText(term, p => p.race2);
    case 'lvl':
    case 'level': return numeric ? bothLvls(term) : null;
    case 'lvl1':  return numeric ? sideNumber(term, p => displayLvl(p.lvl1)) : null;
    case 'lvl2':  return numeric ? sideNumber(term, p => displayLvl(p.lvl2)) : null;
    case 'price':
    case 'cost':  return numeric ? sideNumber(term, p => p.price) : null;
    default:      return null;
  }
}

export function compileFusionFilter(
  query: ParsedQuery, config: FusionFilterConfig = {}
): CompiledFilter<FusionPair> {
  if (query.isEmpty) { return MATCH_ALL; }

  const tests: ((pair: FusionPair) => boolean)[] = [];
  const unknownTerms: string[] = [];

  for (const term of query.terms) {
    const test = makeTermTest(term, config);

    if (test) { tests.push(test); } else { unknownTerms.push(describeTerm(term)); }
  }

  if (!tests.length) { return { predicate: () => true, unknownTerms }; }

  return { predicate: pair => tests.every(test => test(pair)), unknownTerms };
}

export const FUSION_FILTER_HINTS = [
  { syntax: 'pixie', desc: 'Matches either ingredient name or race' },
  { syntax: 'lvl:<=40', desc: 'Both ingredients at or below 40 - recipes you can make now' },
  { syntax: 'race:fairy', desc: 'Either ingredient is that race' },
  { syntax: 'name1:jack', desc: 'Pin one side: name1, name2, race1, race2, lvl1, lvl2' },
  { syntax: 'price:<5000', desc: 'Filter by summoning price' },
  { syntax: '-race:fiend', desc: 'Prefix with - to exclude' },
  { syntax: 'inherit:fire', desc: 'An ingredient brings a fire skill you could inherit' },
  { syntax: 'skill:agi', desc: 'An ingredient knows a skill by name' },
  { syntax: 'have:yes', desc: 'Both ingredients are demons you own' }
];
