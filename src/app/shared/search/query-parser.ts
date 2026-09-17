export type CompareOp = 'match' | 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'range';

export interface QueryTerm {
  field: string;
  op: CompareOp;
  alts: string[];
  low: number;
  high: number;
  negated: boolean;
  raw: string;
}

export interface ParsedQuery {
  raw: string;
  terms: QueryTerm[];
  isEmpty: boolean;
}

export const EMPTY_QUERY: ParsedQuery = { raw: '', terms: [], isEmpty: true };

const RANGE_PATTERN = /^(-?\d+)\s*(?:-|\.\.)\s*(-?\d+)$/;
const COMPARE_PATTERN = /^(>=|<=|=>|=<|>|<|=)?\s*(-?\d+)$/;

function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quoted = false;

  for (const char of raw) {
    if (char === '"' || char === '\u201c' || char === '\u201d') {
      quoted = !quoted;
    } else if (!quoted && /\s/.test(char)) {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += char;
    }
  }

  if (current) { tokens.push(current); }
  return tokens;
}

function parseValue(value: string): { op: CompareOp, alts: string[], low: number, high: number } {
  const range = RANGE_PATTERN.exec(value);

  if (range) {
    const low = parseInt(range[1], 10);
    const high = parseInt(range[2], 10);
    return { op: 'range', alts: [value], low: Math.min(low, high), high: Math.max(low, high) };
  }

  const compare = COMPARE_PATTERN.exec(value);

  if (compare) {
    const num = parseInt(compare[2], 10);

    switch (compare[1]) {
      case '>':  return { op: 'gt',  alts: [value], low: num, high: num };
      case '<':  return { op: 'lt',  alts: [value], low: num, high: num };
      case '>=':
      case '=>': return { op: 'gte', alts: [value], low: num, high: num };
      case '<=':
      case '=<': return { op: 'lte', alts: [value], low: num, high: num };
      default:   return { op: 'eq',  alts: [value], low: num, high: num };
    }
  }

  return {
    op: 'match',
    alts: value.split('|').map(alt => alt.trim()).filter(alt => alt),
    low: NaN,
    high: NaN
  };
}

export function parseQuery(raw: string): ParsedQuery {
  const trimmed = (raw || '').trim();

  if (!trimmed) { return EMPTY_QUERY; }

  const terms: QueryTerm[] = [];

  // Tokens keep their original casing so a query can be rebuilt as typed;
  // matching itself is done on the lowercased copy.
  for (const token of tokenize(trimmed)) {
    const lowered = token.toLocaleLowerCase();
    const negated = lowered.startsWith('-') || lowered.startsWith('!');
    const body = negated ? lowered.slice(1) : lowered;

    if (!body) { continue; }

    const colon = body.indexOf(':');
    const field = colon > 0 ? body.slice(0, colon) : '';
    const value = colon > 0 ? body.slice(colon + 1) : body;

    if (!value) { continue; }

    terms.push(Object.assign({ field, negated, raw: token }, parseValue(value)));
  }

  return { raw: trimmed, terms, isEmpty: terms.length === 0 };
}

export function isNumericTerm(term: QueryTerm): boolean {
  return term.op !== 'match';
}

export function matchesText(term: QueryTerm, haystack: string): boolean {
  if (!haystack) { return false; }
  const target = haystack.toLocaleLowerCase();
  return term.alts.some(alt => target.includes(alt));
}

export function matchesNumber(term: QueryTerm, value: number): boolean {
  if (!Number.isFinite(value)) { return false; }

  switch (term.op) {
    case 'eq':    return value === term.low;
    case 'lt':    return value < term.low;
    case 'lte':   return value <= term.low;
    case 'gt':    return value > term.low;
    case 'gte':   return value >= term.low;
    case 'range': return value >= term.low && value <= term.high;
    default:      return false;
  }
}

export interface CompiledFilter<TItem> {
  predicate: (item: TItem) => boolean;
  unknownTerms: string[];
}

export const MATCH_ALL: CompiledFilter<any> = { predicate: () => true, unknownTerms: [] };

export function describeTerm(term: QueryTerm): string {
  // Values with spaces have to go back out quoted, or re-parsing this string
  // would split one phrase into several terms.
  if (term.raw) { return /\s/.test(term.raw) ? `"${term.raw}"` : term.raw; }

  const alts = term.alts.map(alt => /\s/.test(alt) ? `"${alt}"` : alt);
  return (term.negated ? '-' : '') + (term.field ? term.field + ':' : '') + alts.join('|');
}

export function matchesQueryText(query: ParsedQuery, haystack: string): boolean {
  return query.terms.every(term => matchesText(term, haystack) !== term.negated);
}
