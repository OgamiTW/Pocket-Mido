import { readPanelState, writePanelState } from './filter-panel-query';

const RESIST_HEADERS = ['phy', 'fir', 'ice', 'ele', 'for', 'lig', 'dar'];
const RACES = ['Fairy', 'Deity', 'Dark Hero'];

function read(query: string) {
  return readPanelState(query, RESIST_HEADERS, RACES);
}

describe('readPanelState', () => {
  it('starts empty for a blank query', () => {
    const state = read('');
    expect(state).toEqual({ lvlMin: '', lvlMax: '', race: '', have: '', elements: {}, rest: [] });
  });

  it('reads element states, including long-form field names', () => {
    expect(read('wk:fir').elements).toEqual({ fir: 'wk' });
    expect(read('weak:fire').elements).toEqual({ fir: 'wk' });
    expect(read('nu:ice rp:ele').elements).toEqual({ ice: 'nu', ele: 'rp' });
  });

  it('reads every level form into a min and a max', () => {
    expect(read('lvl:20-40')).toMatchObject({ lvlMin: '20', lvlMax: '40' });
    expect(read('lvl:>=30')).toMatchObject({ lvlMin: '30', lvlMax: '' });
    expect(read('lvl:>30')).toMatchObject({ lvlMin: '31', lvlMax: '' });
    expect(read('lvl:<=50')).toMatchObject({ lvlMin: '', lvlMax: '50' });
    expect(read('lvl:<50')).toMatchObject({ lvlMin: '', lvlMax: '49' });
    expect(read('lvl:42')).toMatchObject({ lvlMin: '42', lvlMax: '42' });
  });

  it('reads a race only when it is one the game actually has', () => {
    expect(read('race:fairy').race).toBe('Fairy');
    expect(read('race:bogus').race).toBe('');
    expect(read('race:bogus').rest).toEqual(['race:bogus']);
  });

  it('leaves everything it does not manage in rest', () => {
    const state = read('jack frost skill:agi st:>30');
    expect(state.rest).toEqual(['jack', 'frost', 'skill:agi', 'st:>30']);
  });

  it('does not claim negated terms', () => {
    const state = read('-weak:fire');
    expect(state.elements).toEqual({});
    expect(state.rest).toEqual(['-weak:fire']);
  });

  it('keeps a second filter on the same element in rest', () => {
    const state = read('wk:fir nu:fir');
    expect(state.elements).toEqual({ fir: 'wk' });
    expect(state.rest).toEqual(['nu:fir']);
  });
});

describe('owned state', () => {
  it('reads have:yes and have:no', () => {
    expect(read('have:yes').have).toBe('yes');
    expect(read('have:no').have).toBe('no');
  });

  it('leaves an unrecognised value alone', () => {
    expect(read('have:maybe').have).toBe('');
    expect(read('have:maybe').rest).toEqual(['have:maybe']);
  });

  it('round trips', () => {
    expect(writePanelState(read('have:yes'))).toBe('have:yes');
  });
});

describe('writePanelState', () => {
  it('writes nothing for an empty state', () => {
    expect(writePanelState(read(''))).toBe('');
  });

  it('quotes a race containing a space', () => {
    expect(writePanelState(read('race:"dark hero"'))).toBe('race:"Dark Hero"');
  });

  it('round trips a query the panel fully manages', () => {
    const query = 'wk:fir lvl:20-40 race:Fairy';
    expect(writePanelState(read(query))).toBe(query);
  });

  it('preserves free text alongside panel controls', () => {
    const state = read('pixie lvl:10-20');
    expect(writePanelState(state)).toBe('lvl:10-20 pixie');
  });

  it('survives a second round trip unchanged', () => {
    const once = writePanelState(read('weak:fire lvl:>20 jack'));
    expect(writePanelState(read(once))).toBe(once);
  });
});
