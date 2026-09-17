import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FusionPair } from '../models';
import { PlayerStateService } from '../../shared/player/player-state.service';
import { FusionPairTableComponent } from './fusion-pair-table.component';

const RACE_ORDER = { Fairy: 0, Jirae: 1, Deity: 2 };

function pair(name1: string, race1: string, lvl1: number,
              name2: string, race2: string, lvl2: number, price: number): FusionPair {
  return { price, race1, lvl1, name1, race2, lvl2, name2 };
}

const PAIRS = [
  pair('Pixie', 'Fairy', 12, 'Jack Frost', 'Fairy', 17, 800),
  pair('Odin', 'Deity', 78, 'Pixie', 'Fairy', 12, 9000),
  pair('Sudama', 'Jirae', 8, 'Koppa', 'Jirae', 5, 400)
];

describe('FusionPairTableComponent', () => {
  let fixture: ComponentFixture<FusionPairTableComponent>;

  function searchInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('table.list-table input.search-input');
  }

  function recipes(): string[] {
    return Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('tbody tr.app-fusion-pair-table-row'))
      .map(row => {
        const cells = row.querySelectorAll('td');
        return `${cells[3].querySelector('a').textContent.trim()}+${cells[6].querySelector('a').textContent.trim()}`;
      });
  }

  function search(query: string) {
    const input = searchInput();
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [FusionPairTableComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(FusionPairTableComponent);
    fixture.componentRef.setInput('raceOrder', RACE_ORDER);
    fixture.componentRef.setInput('inGameCurrencySymbol', 'M');
    fixture.componentRef.setInput('rowData', PAIRS.slice());
    fixture.detectChanges();
  });

  it('renders a search bar over the recipe list', () => {
    expect(searchInput()).toBeTruthy();
  });

  it('lists every recipe before filtering', () => {
    expect(recipes().length).toBe(3);
  });

  it('filters recipes by ingredient name', () => {
    search('pixie');
    expect(recipes().sort()).toEqual(['Odin+Pixie', 'Pixie+Jack Frost']);
  });

  it('filters to recipes makeable at a given level', () => {
    search('lvl:<=20');
    expect(recipes().sort()).toEqual(['Pixie+Jack Frost', 'Sudama+Koppa']);
  });

  it('removes the recipe rows entirely rather than hiding them', () => {
    search('sudama');
    expect(recipes()).toEqual(['Sudama+Koppa']);
    expect(fixture.nativeElement.querySelectorAll('tbody tr.app-fusion-pair-table-row').length).toBe(1);
  });

  it('shows the match count against the total', () => {
    search('race:jirae');
    const count = fixture.nativeElement.querySelector('.search-count');
    expect(count.textContent.replace(/\s+/g, ' ').trim()).toBe('1 / 3');
  });

  it('says so when nothing matches', () => {
    search('name:nothing');
    expect(recipes().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No fusions found');
  });

  it('restores every recipe when the filter is cleared', () => {
    search('pixie');
    search('');
    expect(recipes().length).toBe(3);
  });

  describe('reset sort', () => {
    function columnHeaders(): HTMLElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.sticky-header th.sortable'));
    }

    function resetButton(): HTMLButtonElement {
      return Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.recipe-filters button'))
        .find(b => b.textContent.trim() === 'Reset sort');
    }

    it('offers a reset button', () => {
      expect(resetButton()).toBeTruthy();
    });

    it('puts the rows back in their default order', () => {
      const original = recipes();

      columnHeaders()[3].click();
      fixture.detectChanges();
      expect(recipes()).not.toEqual(original);

      resetButton().click();
      fixture.detectChanges();
      expect(recipes()).toEqual(original);
    });

    it('clears the sort direction arrows', () => {
      columnHeaders()[3].click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll(
        '.sticky-header th.sortable.asc, .sticky-header th.sortable.desc').length).toBeGreaterThan(0);

      resetButton().click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll(
        '.sticky-header th.sortable.asc, .sticky-header th.sortable.desc').length).toBe(0);
    });

    it('also switches off cheapest-I-can-make', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();

      const best = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.reach-btn'))
        .find(b => b.textContent.trim() === 'Cheapest I can make');

      best.click();
      fixture.detectChanges();
      expect(best.classList.contains('on')).toBe(true);

      resetButton().click();
      fixture.detectChanges();
      expect(best.classList.contains('on')).toBe(false);
    });
  });

  describe('demons you already have', () => {
    function stars(): HTMLButtonElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('tbody tr .own-star'));
    }

    it('shows a star for both ingredients of every recipe', () => {
      expect(stars().length).toBe(6);
      expect(stars().every(s => s.classList.contains('not-owned'))).toBe(true);
    });

    // Rows are price-sorted, so find the star by the name beside it.
    function starFor(name: string): HTMLButtonElement {
      return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody td'))
        .filter(cell => {
          const link = cell.querySelector('a');
          return link && link.textContent.trim() === name;
        })
        .map(cell => cell.querySelector('.own-star') as HTMLButtonElement)[0];
    }

    it('marks a demon as owned from inside a recipe', () => {
      starFor('Pixie').click();
      fixture.detectChanges();

      expect(TestBed.inject(PlayerStateService).isOwned('Pixie')).toBe(true);
    });

    it('marks it everywhere that demon appears', () => {
      starFor('Pixie').click();
      fixture.detectChanges();

      // Pixie is an ingredient in two of the three recipes.
      expect(stars().filter(star => star.classList.contains('owned')).length).toBe(2);
    });

    it('filters to recipes where you have both ingredients', () => {
      const player = TestBed.inject(PlayerStateService);
      player.toggleOwned('Pixie');
      player.toggleOwned('Jack Frost');
      fixture.detectChanges();

      search('have:yes');
      expect(recipes()).toEqual(['Pixie+Jack Frost']);
    });
  });

  describe('recipes out of reach', () => {
    function dimmed(): string[] {
      return Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('tbody tr.app-fusion-pair-table-row.over-lvl'))
        .map(row => {
          const cells = row.querySelectorAll('td');
          return `${cells[3].querySelector('a').textContent.trim()}+${cells[6].querySelector('a').textContent.trim()}`;
        });
    }

    it('dims nothing until you say what level you are', () => {
      expect(dimmed()).toEqual([]);
    });

    it('dims recipes needing an ingredient above your level', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();
      expect(dimmed()).toEqual(['Odin+Pixie']);
    });

    it('dims nothing once your level covers every ingredient', () => {
      TestBed.inject(PlayerStateService).setLvl(80);
      fixture.detectChanges();
      expect(dimmed()).toEqual([]);
    });

    function reachButton(): HTMLButtonElement {
      return fixture.nativeElement.querySelector('.reach-btn');
    }

    it('offers no level switch until you say what level you are', () => {
      expect(reachButton()).toBeNull();
    });

    it('offers the switch once a level is set', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();

      expect(reachButton().textContent).toContain('Lvl 20');
    });

    it('hides the recipes you cannot make when switched on', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();
      reachButton().click();
      fixture.detectChanges();

      expect(recipes().sort()).toEqual(['Pixie+Jack Frost', 'Sudama+Koppa']);
    });

    it('says how many it hid', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();
      reachButton().click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.reach-note').textContent).toContain('1 hidden');
    });

    it('combines with whatever is typed in the search box', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();
      reachButton().click();
      search('race:jirae');
      fixture.detectChanges();

      expect(recipes()).toEqual(['Sudama+Koppa']);
    });

    it('brings them back when switched off', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();
      reachButton().click();
      fixture.detectChanges();
      reachButton().click();
      fixture.detectChanges();

      expect(recipes().length).toBe(3);
    });

    it('reacts to raising your level', () => {
      const player = TestBed.inject(PlayerStateService);
      player.setLvl(20);
      fixture.detectChanges();
      reachButton().click();
      fixture.detectChanges();
      expect(recipes().length).toBe(2);

      player.setLvl(90);
      fixture.detectChanges();
      expect(recipes().length).toBe(3);
    });

    it('still lists the dimmed recipe rather than hiding it', () => {
      TestBed.inject(PlayerStateService).setLvl(20);
      fixture.detectChanges();
      expect(recipes().length).toBe(3);
    });
  });
});
