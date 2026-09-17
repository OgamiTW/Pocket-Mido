import { QueryTerm, describeTerm, parseQuery } from '../../shared/search/query-parser';
import { elemMatches } from './element-match';
import { readHaveTerm, readLvlTerm, writeLvlTerm } from './panel-terms';

export interface RecipePanelState {
  lvlMin: string;
  lvlMax: string;
  inherit: string;
  have: string;
  rest: string[];
}

function consumeLvl(term: QueryTerm, state: RecipePanelState): boolean {
  if (state.lvlMin || state.lvlMax) { return false; }

  const range = readLvlTerm(term);

  if (!range) { return false; }

  state.lvlMin = range.min;
  state.lvlMax = range.max;
  return true;
}

function consumeInherit(term: QueryTerm, elems: string[], state: RecipePanelState): boolean {
  if (term.field !== 'inherit' || state.inherit || term.alts.length !== 1) { return false; }

  const matched = elems.filter(elem => elemMatches(elem, term.alts));

  if (matched.length !== 1) { return false; }

  state.inherit = matched[0];
  return true;
}

function consumeHave(term: QueryTerm, state: RecipePanelState): boolean {
  if (state.have) { return false; }

  const have = readHaveTerm(term);

  if (!have) { return false; }

  state.have = have;
  return true;
}

// Same idea as the demon list panel: split the query into the parts the buttons
// can show and the rest, which stays in the text box untouched.
export function readRecipePanel(query: string, elems: string[]): RecipePanelState {
  const state: RecipePanelState = { lvlMin: '', lvlMax: '', inherit: '', have: '', rest: [] };

  for (const term of parseQuery(query).terms) {
    const claimed = !term.negated && (
      consumeLvl(term, state) ||
      consumeInherit(term, elems || [], state) ||
      consumeHave(term, state)
    );

    if (!claimed) { state.rest.push(describeTerm(term)); }
  }

  return state;
}

export function writeRecipePanel(state: RecipePanelState): string {
  const parts: string[] = [];
  const lvl = writeLvlTerm(state.lvlMin, state.lvlMax);

  if (lvl) { parts.push(lvl); }
  if (state.inherit) { parts.push(`inherit:${state.inherit}`); }
  if (state.have) { parts.push(`have:${state.have}`); }

  return parts.concat(state.rest).join(' ').trim();
}
