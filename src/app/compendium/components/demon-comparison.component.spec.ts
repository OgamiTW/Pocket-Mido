import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Demon } from '../models';
import {
  DemonComparisonComponent, MAX_COLUMNS, buildComparison, resistRank
} from './demon-comparison.component';
import { countSlots } from './recipe-generator.component';

const WEAK = 6 << 10;
const NORMAL = 5 << 10;
const NULLED = 3 << 10;
const DRAIN = 1 << 10;

function demon(name: string, lvl: number, stats: number[], resists: number[]): Demon {
  return {
    race: 'Fairy', lvl, currLvl: lvl, name, price: 0, inherits: 0, stats, resists,
    fusion: 'normal', skills: {}, searchTags: name.toLocaleLowerCase()
  };
}

const PIXIE = demon('Pixie', 12, [10, 20], [WEAK, NULLED]);
const JACK = demon('Jack Frost', 17, [14, 20], [NORMAL, DRAIN]);
const ODIN = demon('Odin', 78, [55, 48], [NORMAL, NORMAL]);
const ALL = [PIXIE, JACK, ODIN];

describe('resistRank', () => {
  it('orders affinities from worst to best', () => {
    expect(resistRank(WEAK)).toBeLessThan(resistRank(NORMAL));
    expect(resistRank(NORMAL)).toBeLessThan(resistRank(NULLED));
    expect(resistRank(NULLED)).toBeLessThan(resistRank(DRAIN));
  });
});

describe('buildComparison', () => {
  it('needs at least two demons', () => {
    expect(buildComparison([PIXIE], ['St'], ['fir'])).toEqual([]);
    expect(buildComparison([PIXIE, null], ['St'], ['fir'])).toEqual([]);
  });

  it('starts with level, then stats, then resistances', () => {
    const rows = buildComparison([PIXIE, JACK], ['St', 'Ma'], ['fir', 'ice']);
    expect(rows.map(r => r.label)).toEqual(['Lvl', 'St', 'Ma', 'fir', 'ice']);
  });

  it('carries one value per demon', () => {
    const rows = buildComparison([PIXIE, JACK, ODIN], ['St'], ['fir']);

    expect(rows[0].values).toEqual([12, 17, 78]);
    expect(rows[1].values).toEqual([10, 14, 55]);
  });

  it('handles more than two', () => {
    const rows = buildComparison(ALL, ['St', 'Ma'], ['fir', 'ice']);
    expect(rows.every(row => row.values.length === 3)).toBe(true);
  });

  it('ranks a resistance by how good the affinity is, not its raw number', () => {
    const rows = buildComparison([PIXIE, JACK], ['St'], ['fir', 'ice']);
    const fire = rows.find(r => r.label === 'fir');
    const ice = rows.find(r => r.label === 'ice');

    expect(fire.ranks[1]).toBeGreaterThan(fire.ranks[0]);
    expect(ice.ranks[1]).toBeGreaterThan(ice.ranks[0]);
  });

  it('marks the best of each row', () => {
    const rows = buildComparison(ALL, ['St'], []);

    expect(rows[0].best).toBe(78);
    expect(rows[1].best).toBe(55);
  });
});

describe('countSlots', () => {
  it('counts only rows the player can choose', () => {
    expect(countSlots([
      { disabled: true, elem: '-', skill: 'Agi', demon: 'Pixie' },
      { disabled: false, elem: '-', skill: 'Dia', demon: 'Pixie' },
      { disabled: false, elem: '-', skill: '-', demon: '-' }
    ])).toEqual({ used: 1, total: 2 });
  });

  it('handles an empty list', () => {
    expect(countSlots([])).toEqual({ used: 0, total: 0 });
    expect(countSlots(null)).toEqual({ used: 0, total: 0 });
  });
});

describe('DemonComparisonComponent', () => {
  let fixture: ComponentFixture<DemonComparisonComponent>;

  function pickers(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input.picker-field'));
  }

  function button(label: string): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.controls button'))
      .find(b => b.textContent.trim() === label);
  }

  function choose(index: number, name: string) {
    fixture.componentInstance.setName(index, name);
    fixture.detectChanges();
  }

  function bestCells(rowLabel: string): number[] {
    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'));
    const row = rows.find(r => r.querySelector('td.axis').textContent.trim() === rowLabel);

    return Array.from<HTMLElement>(row.querySelectorAll('td'))
      .slice(1)
      .reduce<number[]>((acc, cell, i) => cell.classList.contains('better') ? acc.concat(i) : acc, []);
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [DemonComparisonComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DemonComparisonComponent);
    fixture.componentRef.setInput('demons', ALL);
    fixture.componentRef.setInput('statHeaders', ['St', 'Ma']);
    fixture.componentRef.setInput('resistHeaders', ['fir', 'ice']);
    fixture.detectChanges();
  });

  it('starts with two columns', () => {
    expect(pickers().length).toBe(2);
  });

  it('asks for two before comparing anything', () => {
    expect(fixture.nativeElement.querySelector('td.empty').textContent).toContain('at least two');
  });

  it('adds a column on demand', () => {
    button('+').click();
    fixture.detectChanges();

    expect(pickers().length).toBe(3);
  });

  it('stops at the maximum', () => {
    for (let i = 0; i < 6; i++) {
      const add = button('+');
      if (add && !add.disabled) { add.click(); fixture.detectChanges(); }
    }

    expect(pickers().length).toBe(MAX_COLUMNS);
    expect(button('+').disabled).toBe(true);
  });

  it('removes a column again', () => {
    button('+').click();
    fixture.detectChanges();
    button('−').click();
    fixture.detectChanges();

    expect(pickers().length).toBe(2);
  });

  it('never drops below two', () => {
    expect(button('−').disabled).toBe(true);
  });

  it('compares three demons at once', () => {
    button('+').click();
    fixture.detectChanges();

    choose(0, 'Pixie');
    choose(1, 'Jack Frost');
    choose(2, 'Odin');

    expect(fixture.nativeElement.querySelector('td.empty')).toBeNull();
    expect(bestCells('Lvl')).toEqual([2]);
  });

  it('marks nothing when everyone ties', () => {
    choose(0, 'Pixie');
    choose(1, 'Jack Frost');

    // Both have Ma 20.
    expect(bestCells('Ma')).toEqual([]);
  });

  it('offers a star for each demon being compared', () => {
    choose(0, 'Pixie');
    choose(1, 'Jack Frost');

    expect(fixture.nativeElement.querySelectorAll('.star-cell .own-star').length).toBe(2);
  });
});
