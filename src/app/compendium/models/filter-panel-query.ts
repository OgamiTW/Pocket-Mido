import { QueryTerm, describeTerm, parseQuery } from '../../shared/search/query-parser';
import { singleResistCode } from './demon-filter';
import { elemMatches } from './element-match';
import { HAVE_STATES, readHaveTerm, readLvlTerm, writeLvlTerm } from './panel-terms';

export { HAVE_STATES };

// The states the element buttons cycle through, in click order.
export const RESIST_STATES = ['wk', 'rs', 'nu', 'rp', 'ab'];

export interface PanelState {
  lvlMin: string;
  lvlMax: string;
  race: string;
  have: string;
  elements: { [elem: string]: string };
  rest: string[];
}



function consumeResist(term: QueryTerm, resistHeaders: string[], state: PanelState): boolean {
  const code = singleResistCode(term.field);

  if (!code || RESIST_STATES.indexOf(code) === -1 || term.alts.length !== 1) { return false; }

  const matched = resistHeaders.filter(header => elemMatches(header, term.alts));

  if (matched.length !== 1 || state.elements[matched[0]]) { return false; }

  state.elements[matched[0]] = code;
  return true;
}

function consumeLvl(term: QueryTerm, state: PanelState): boolean {
  if (state.lvlMin || state.lvlMax) { return false; }

  const range = readLvlTerm(term);

  if (!range) { return false; }

  state.lvlMin = range.min;
  state.lvlMax = range.max;
  return true;
}

function consumeRace(term: QueryTerm, races: string[], state: PanelState): boolean {
  if (term.field !== 'race' || state.race || term.alts.length !== 1) { return false; }

  const matched = races.find(race => race.toLocaleLowerCase() === term.alts[0]);

  if (!matched) { return false; }

  state.race = matched;
  return true;
}

function consumeHave(term: QueryTerm, state: PanelState): boolean {
  if (state.have) { return false; }

  const have = readHaveTerm(term);

  if (!have) { return false; }

  state.have = have;
  return true;
}

function quote(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

// Splits a query into the parts the panel can show as controls and the rest,
// which stays in the text box untouched.
export function readPanelState(query: string, resistHeaders: string[], races: string[]): PanelState {
  const state: PanelState = { lvlMin: '', lvlMax: '', race: '', have: '', elements: {}, rest: [] };

  for (const term of parseQuery(query).terms) {
    const claimed = !term.negated && (
      consumeResist(term, resistHeaders, state) ||
      consumeLvl(term, state) ||
      consumeRace(term, races, state) ||
      consumeHave(term, state)
    );

    if (!claimed) { state.rest.push(describeTerm(term)); }
  }

  return state;
}

export function writePanelState(state: PanelState): string {
  const parts: string[] = [];

  for (const elem of Object.keys(state.elements)) {
    if (state.elements[elem]) { parts.push(`${state.elements[elem]}:${elem}`); }
  }

  const lvl = writeLvlTerm(state.lvlMin, state.lvlMax);

  if (lvl) { parts.push(lvl); }

  if (state.race) { parts.push(`race:${quote(state.race)}`); }
  if (state.have) { parts.push(`have:${state.have}`); }

  return parts.concat(state.rest).join(' ').trim();
}
