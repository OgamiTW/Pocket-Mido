import { readSkillPanel, writeSkillPanel } from './skill-panel-query';

const ELEMS = ['fir', 'ice', 'ele', 'rec'];
const TARGETS = ['Single', 'All', 'Self'];

function read(query: string) {
  return readSkillPanel(query, ELEMS, TARGETS);
}

describe('readSkillPanel', () => {
  it('starts empty for a blank query', () => {
    expect(read('')).toEqual({
      elem: '', target: '', costMin: '', costMax: '', rankMin: '', rankMax: '', rest: []
    });
  });

  it('reads the element, including its long name', () => {
    expect(read('elem:fir').elem).toBe('fir');
    expect(read('elem:fire').elem).toBe('fir');
    expect(read('element:ice').elem).toBe('ice');
  });

  it('leaves an element the game does not have alone', () => {
    expect(read('elem:bogus').elem).toBe('');
    expect(read('elem:bogus').rest).toEqual(['elem:bogus']);
  });

  it('reads every cost form into a min and a max', () => {
    expect(read('cost:10-30')).toMatchObject({ costMin: '10', costMax: '30' });
    expect(read('cost:>=20')).toMatchObject({ costMin: '20', costMax: '' });
    expect(read('cost:<=40')).toMatchObject({ costMin: '', costMax: '40' });
    expect(read('cost:>20').costMin).toBe('21');
    expect(read('cost:<40').costMax).toBe('39');
    expect(read('mp:12')).toMatchObject({ costMin: '12', costMax: '12' });
  });

  it('reads rank separately from cost', () => {
    const state = read('cost:<=20 rank:30-50');

    expect(state.costMax).toBe('20');
    expect(state.rankMin).toBe('30');
    expect(state.rankMax).toBe('50');
  });

  it('reads a target only when the game has it', () => {
    expect(read('target:all').target).toBe('All');
    expect(read('target:nobody').target).toBe('');
    expect(read('target:nobody').rest).toEqual(['target:nobody']);
  });

  it('leaves anything it does not manage in rest', () => {
    const state = read('mudo by:pixie elem:ice');

    expect(state.elem).toBe('ice');
    expect(state.rest).toEqual(['mudo', 'by:pixie']);
  });

  it('does not claim negated terms', () => {
    expect(read('-elem:fire').elem).toBe('');
    expect(read('-elem:fire').rest).toEqual(['-elem:fire']);
  });

  it('keeps a second filter on the same field in rest', () => {
    const state = read('elem:fir elem:ice');

    expect(state.elem).toBe('fir');
    expect(state.rest).toEqual(['elem:ice']);
  });
});

describe('writeSkillPanel', () => {
  it('writes nothing for an empty state', () => {
    expect(writeSkillPanel(read(''))).toBe('');
  });

  it('round trips a query the panel fully manages', () => {
    const query = 'elem:fir cost:10-30 rank:>=40 target:all';
    expect(writeSkillPanel(read(query))).toBe(query);
  });

  it('preserves free text alongside the buttons', () => {
    expect(writeSkillPanel(read('mudo elem:ice'))).toBe('elem:ice mudo');
  });

  it('survives a second round trip unchanged', () => {
    const once = writeSkillPanel(read('elem:fire cost:>20 pierce'));
    expect(writeSkillPanel(read(once))).toBe(once);
  });

  it('quotes a target containing a space', () => {
    const state = readSkillPanel('', ELEMS, ['One Foe']);
    state.target = 'One Foe';

    expect(writeSkillPanel(state)).toBe('target:"one foe"');
  });
});
