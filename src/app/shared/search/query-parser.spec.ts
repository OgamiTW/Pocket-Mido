import { describeTerm, parseQuery, matchesQueryText } from './query-parser';

describe('parseQuery', () => {
  it('returns an empty query for blank input', () => {
    expect(parseQuery('').isEmpty).toBe(true);
    expect(parseQuery('   ').isEmpty).toBe(true);
  });

  it('splits free text into one term per word', () => {
    const query = parseQuery('jack frost');
    expect(query.terms.length).toBe(2);
    expect(query.terms[0].field).toBe('');
    expect(query.terms[0].alts).toEqual(['jack']);
    expect(query.terms[1].alts).toEqual(['frost']);
  });

  it('keeps quoted phrases as a single term', () => {
    const query = parseQuery('"dark hero"');
    expect(query.terms.length).toBe(1);
    expect(query.terms[0].alts).toEqual(['dark hero']);
  });

  it('parses field filters and lowercases them', () => {
    const query = parseQuery('Race:Fairy');
    expect(query.terms[0].field).toBe('race');
    expect(query.terms[0].alts).toEqual(['fairy']);
  });

  it('parses alternatives separated by a pipe', () => {
    expect(parseQuery('race:fairy|jirae').terms[0].alts).toEqual(['fairy', 'jirae']);
  });

  it('parses negation with - and !', () => {
    expect(parseQuery('-race:fiend').terms[0].negated).toBe(true);
    expect(parseQuery('!pixie').terms[0].negated).toBe(true);
  });

  it('parses numeric ranges and comparators', () => {
    const range = parseQuery('lvl:20-40').terms[0];
    expect(range.op).toBe('range');
    expect(range.low).toBe(20);
    expect(range.high).toBe(40);

    expect(parseQuery('lvl:>30').terms[0].op).toBe('gt');
    expect(parseQuery('lvl:<=50').terms[0].op).toBe('lte');
    expect(parseQuery('lvl:42').terms[0].op).toBe('eq');
    expect(parseQuery('lvl:42').terms[0].low).toBe(42);
  });

  it('flips reversed ranges so the bounds stay usable', () => {
    const range = parseQuery('lvl:40-20').terms[0];
    expect(range.low).toBe(20);
    expect(range.high).toBe(40);
  });

  it('treats non-numeric values as text', () => {
    expect(parseQuery('name:pixie').terms[0].op).toBe('match');
  });
});

describe('matchesQueryText', () => {
  it('requires every term to match', () => {
    const query = parseQuery('jack frost');
    expect(matchesQueryText(query, 'Jack Frost')).toBe(true);
    expect(matchesQueryText(query, 'Jack the Ripper')).toBe(false);
  });

  it('honours negated terms', () => {
    const query = parseQuery('jack -frost');
    expect(matchesQueryText(query, 'Jack the Ripper')).toBe(true);
    expect(matchesQueryText(query, 'Jack Frost')).toBe(false);
  });
});

describe('describeTerm round trip', () => {
  it('rebuilds a query that parses back to the same terms', () => {
    const raw = 'race:fairy|jirae lvl:20-40 -weak:fire "dark hero" pixie';
    const rebuilt = parseQuery(raw).terms.map(describeTerm).join(' ');

    expect(parseQuery(rebuilt).terms).toEqual(parseQuery(raw).terms);
  });

  it('keeps a quoted phrase as one term', () => {
    const term = parseQuery('"dark hero"').terms[0];
    expect(describeTerm(term)).toBe('"dark hero"');
    expect(parseQuery(describeTerm(term)).terms.length).toBe(1);
  });
});

describe('original casing', () => {
  it('keeps the text the user typed when rebuilding a query', () => {
    const rebuilt = parseQuery('Pixie race:Fairy').terms.map(describeTerm).join(' ');
    expect(rebuilt).toBe('Pixie race:Fairy');
  });

  it('still matches case-insensitively', () => {
    expect(matchesQueryText(parseQuery('PIXIE'), 'pixie,fairy')).toBe(true);
  });
});
