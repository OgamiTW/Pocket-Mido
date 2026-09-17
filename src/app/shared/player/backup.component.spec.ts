import { applyBackup, collectBackup } from './backup.component';

class FakeStorage implements Storage {
  private map = new Map<string, string>();

  get length() { return this.map.size; }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  [name: string]: any;
}

function store(entries: { [k: string]: string }): FakeStorage {
  const s = new FakeStorage();
  for (const k of Object.keys(entries)) { s.setItem(k, entries[k]); }
  return s;
}

describe('collectBackup', () => {
  it('takes only this tool\'s own keys', () => {
    const file = collectBackup(store({
      'megaten-fusion-tool.player.smt5': '{"lvl":40}',
      'megaten-fusion-tool.search.smt5.demons': 'race:fairy',
      'some-other-app': 'leave me alone'
    }));

    expect(Object.keys(file.saved).sort()).toEqual([
      'megaten-fusion-tool.player.smt5',
      'megaten-fusion-tool.search.smt5.demons'
    ]);
  });

  it('stamps a format version', () => {
    expect(collectBackup(store({})).format).toBe(1);
  });

  it('copes with nothing saved yet', () => {
    expect(collectBackup(store({})).saved).toEqual({});
  });
});

describe('applyBackup', () => {
  it('writes the entries back', () => {
    const target = store({});
    const count = applyBackup(target, {
      format: 1,
      saved: { 'megaten-fusion-tool.player.smt5': '{"lvl":40}' }
    });

    expect(count).toBe(1);
    expect(target.getItem('megaten-fusion-tool.player.smt5')).toBe('{"lvl":40}');
  });

  it('refuses to write keys belonging to anything else', () => {
    const target = store({});
    const count = applyBackup(target, {
      format: 1,
      saved: { 'evil-key': 'nope', 'megaten-fusion-tool.player.p5': 'ok' }
    });

    expect(count).toBe(1);
    expect(target.getItem('evil-key')).toBeNull();
  });

  it('ignores values that are not strings', () => {
    const target = store({});
    const count = applyBackup(target, {
      format: 1,
      saved: { 'megaten-fusion-tool.player.p5': { lvl: 1 } as any }
    });

    expect(count).toBe(0);
  });

  it('rejects a file that is not a backup', () => {
    expect(() => applyBackup(store({}), null)).toThrow();
    expect(() => applyBackup(store({}), { nope: true })).toThrow();
    expect(() => applyBackup(store({}), 'a string')).toThrow();
  });

  it('round trips', () => {
    const source = store({
      'megaten-fusion-tool.player.smt5': '{"lvl":40,"owned":["Pixie"]}',
      'megaten-fusion-tool.savedFilters.smt5.demons': '[{"name":"Fairies","query":"race:fairy"}]'
    });
    const target = store({});

    applyBackup(target, collectBackup(source));

    expect(collectBackup(target)).toEqual(collectBackup(source));
  });
});
