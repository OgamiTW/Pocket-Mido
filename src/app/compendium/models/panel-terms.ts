import { QueryTerm } from '../../shared/search/query-parser';

export const HAVE_STATES = ['yes', 'no'];

export interface LvlRange {
  min: string;
  max: string;
}

// Every numeric form the query language accepts, flattened into a min and a max
// so a pair of number inputs can show it.
export function readRangeTerm(term: QueryTerm, fields: string[]): LvlRange {
  if (fields.indexOf(term.field) === -1) { return null; }

  switch (term.op) {
    case 'range': return { min: `${term.low}`, max: `${term.high}` };
    case 'gte':   return { min: `${term.low}`, max: '' };
    case 'gt':    return { min: `${term.low + 1}`, max: '' };
    case 'lte':   return { min: '', max: `${term.low}` };
    case 'lt':    return { min: '', max: `${term.low - 1}` };
    case 'eq':    return { min: `${term.low}`, max: `${term.low}` };
    default:      return null;
  }
}

export function writeRangeTerm(field: string, min: string, max: string): string {
  const low = (min || '').trim();
  const high = (max || '').trim();

  if (low && high) { return `${field}:${low}-${high}`; }
  if (low) { return `${field}:>=${low}`; }
  if (high) { return `${field}:<=${high}`; }

  return '';
}

export function readLvlTerm(term: QueryTerm): LvlRange {
  return readRangeTerm(term, ['lvl', 'level']);
}

export function writeLvlTerm(min: string, max: string): string {
  return writeRangeTerm('lvl', min, max);
}

export function readHaveTerm(term: QueryTerm): string {
  const fields = ['have', 'own', 'owned'];

  if (fields.indexOf(term.field) === -1 || term.alts.length !== 1) { return ''; }

  return HAVE_STATES.indexOf(term.alts[0]) === -1 ? '' : term.alts[0];
}

export function nextHaveState(have: string): string {
  const index = HAVE_STATES.indexOf(have);
  return index === HAVE_STATES.length - 1 ? '' : HAVE_STATES[index + 1];
}
