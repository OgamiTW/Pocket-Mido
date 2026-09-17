import { QueryTerm, describeTerm, parseQuery } from '../../shared/search/query-parser';
import { elemMatches } from './element-match';
import { readRangeTerm, writeRangeTerm } from './panel-terms';

export interface SkillPanelState {
  elem: string;
  target: string;
  costMin: string;
  costMax: string;
  rankMin: string;
  rankMax: string;
  rest: string[];
}

const COST_FIELDS = ['cost', 'mp'];
const RANK_FIELDS = ['rank'];

function consumeElem(term: QueryTerm, elems: string[], state: SkillPanelState): boolean {
  if (term.field !== 'elem' && term.field !== 'element') { return false; }
  if (state.elem || term.alts.length !== 1) { return false; }

  const matched = (elems || []).filter(elem => elemMatches(elem, term.alts));

  if (matched.length !== 1) { return false; }

  state.elem = matched[0];
  return true;
}

function consumeTarget(term: QueryTerm, targets: string[], state: SkillPanelState): boolean {
  if (term.field !== 'target' || state.target || term.alts.length !== 1) { return false; }

  const matched = (targets || []).find(target => target.toLocaleLowerCase() === term.alts[0]);

  if (!matched) { return false; }

  state.target = matched;
  return true;
}

function consumeCost(term: QueryTerm, state: SkillPanelState): boolean {
  if (state.costMin || state.costMax) { return false; }

  const range = readRangeTerm(term, COST_FIELDS);

  if (!range) { return false; }

  state.costMin = range.min;
  state.costMax = range.max;
  return true;
}

function consumeRank(term: QueryTerm, state: SkillPanelState): boolean {
  if (state.rankMin || state.rankMax) { return false; }

  const range = readRangeTerm(term, RANK_FIELDS);

  if (!range) { return false; }

  state.rankMin = range.min;
  state.rankMax = range.max;
  return true;
}

// Splits a skill query into the parts the buttons can show and the rest, which
// stays in the text box untouched.
export function readSkillPanel(query: string, elems: string[], targets: string[]): SkillPanelState {
  const state: SkillPanelState = {
    elem: '', target: '', costMin: '', costMax: '', rankMin: '', rankMax: '', rest: []
  };

  for (const term of parseQuery(query).terms) {
    const claimed = !term.negated && (
      consumeElem(term, elems, state) ||
      consumeTarget(term, targets, state) ||
      consumeCost(term, state) ||
      consumeRank(term, state)
    );

    if (!claimed) { state.rest.push(describeTerm(term)); }
  }

  return state;
}

export function writeSkillPanel(state: SkillPanelState): string {
  const parts: string[] = [];
  const cost = writeRangeTerm('cost', state.costMin, state.costMax);
  const rank = writeRangeTerm('rank', state.rankMin, state.rankMax);

  if (state.elem) { parts.push('elem:' + state.elem); }
  if (cost) { parts.push(cost); }
  if (rank) { parts.push(rank); }

  if (state.target) {
    const value = state.target.toLocaleLowerCase();
    parts.push('target:' + (/\s/.test(value) ? '"' + value + '"' : value));
  }

  return parts.concat(state.rest).join(' ').trim();
}
