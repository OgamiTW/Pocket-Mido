import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Demon } from '../models';
import { makeDefaultDemonSort } from '../constants';
import { PlayerStateService } from '../../shared/player/player-state.service';
import { SmtDemonListComponent } from './smt-demon-list.component';

const STAT_HEADERS = ['St', 'Ma', 'Vi', 'Ag', 'Lu'];
const RESIST_HEADERS = ['phy', 'fir', 'ice', 'ele', 'for', 'lig', 'dar'];
const RACE_ORDER = { Fairy: 0, Deity: 1 };

// Packed as (code << 10) + percent / 2.5, the way the compendium builds them.
const WEAK = (6 << 10) | 50;     // 125%
const NORMAL = (5 << 10) | 40;   // 100%
const AILMENT_HEADERS = ['poison', 'bind'];

function makeDemon(name: string, race: string, lvl: number, resists: number[]): Demon {
  return {
    race, lvl, currLvl: lvl, name, price: 500, inherits: 0,
    stats: [10, 20, 12, 18, 9], resists, fusion: 'normal', skills: { Zio: 0 },
    ailments: [WEAK, NORMAL],
    searchTags: [name, race].join(',').toLocaleLowerCase()
  };
}

const DEMONS = [
  makeDemon('Pixie', 'Fairy', 12, [NORMAL, WEAK, NORMAL, NORMAL, NORMAL, NORMAL, NORMAL]),
  makeDemon('Jack Frost', 'Fairy', 17, [NORMAL, WEAK, NORMAL, NORMAL, NORMAL, NORMAL, NORMAL]),
  makeDemon('Odin', 'Deity', 78, [NORMAL, NORMAL, NORMAL, WEAK, NORMAL, NORMAL, NORMAL])
];

describe('SmtDemonListComponent', () => {
  let fixture: ComponentFixture<SmtDemonListComponent>;

  function searchInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.sticky-header input.search-input');
  }

  function visibleNames(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'))
      .filter(row => !row.classList.contains('hidden'))
      .map(row => row.querySelectorAll('td')[2].querySelector('a').textContent.trim());
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
      imports: [SmtDemonListComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SmtDemonListComponent);
    fixture.componentRef.setInput('raceOrder', RACE_ORDER);
    fixture.componentRef.setInput('statHeaders', STAT_HEADERS);
    fixture.componentRef.setInput('resistHeaders', RESIST_HEADERS);
    fixture.componentRef.setInput('ailmentHeaders', AILMENT_HEADERS);
    fixture.componentRef.setInput('rowData', DEMONS.slice().sort(makeDefaultDemonSort(RACE_ORDER)));
    fixture.detectChanges();
  });

  it('renders a search bar in the sticky header', () => {
    expect(searchInput()).toBeTruthy();
  });

  it('shows every demon before any filtering', () => {
    expect(visibleNames().sort()).toEqual(['Jack Frost', 'Odin', 'Pixie']);
  });

  it('hides rows that do not match free text', () => {
    search('jack');
    expect(visibleNames()).toEqual(['Jack Frost']);
  });

  it('hides rows that do not match a field filter', () => {
    search('race:fairy lvl:>15');
    expect(visibleNames()).toEqual(['Jack Frost']);
  });

  it('filters on decoded resistances', () => {
    search('weak:fire');
    expect(visibleNames().sort()).toEqual(['Jack Frost', 'Pixie']);
  });

  it('reports the match count next to the input', () => {
    search('race:fairy');
    const count = fixture.nativeElement.querySelector('.sticky-header .search-count');
    expect(count.textContent.replace(/\s+/g, ' ').trim()).toBe('2 / 3');
  });

  it('restores every row when the filter is cleared', () => {
    search('jack');
    expect(visibleNames().length).toBe(1);

    fixture.nativeElement.querySelector('.sticky-header .search-btn').click();
    fixture.detectChanges();

    expect(visibleNames().length).toBe(3);
  });

  function elemToggles(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.sticky-header .elem-toggle'));
  }

  function clickElem(index: number) {
    elemToggles()[index].click();
    fixture.detectChanges();
  }

  function currentQuery(): string {
    return searchInput().value;
  }

  function columnNames(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'))
      .map(row => row.querySelectorAll('td')[2].querySelector('a').textContent.trim());
  }

  describe('visual filter panel', () => {
    it('renders one toggle per resistance column', () => {
      expect(elemToggles().length).toBe(RESIST_HEADERS.length);
    });

    it('renders the sprite div each toggle needs to show an icon', () => {
      const icons = elemToggles().map(toggle => toggle.querySelector('div.element-icon'));

      expect(icons.every(icon => !!icon)).toBe(true);
      RESIST_HEADERS.forEach((elem, i) => {
        expect(icons[i].classList.contains('element-icon')).toBe(true);
        expect(icons[i].classList.contains(elem)).toBe(true);
      });
    });

    it('filters by weakness when an element is clicked', () => {
      clickElem(1);
      expect(currentQuery()).toBe('wk:fir');
      expect(visibleNames().sort()).toEqual(['Jack Frost', 'Pixie']);
    });

    it('cycles the element through each affinity state', () => {
      clickElem(1);
      expect(currentQuery()).toBe('wk:fir');
      clickElem(1);
      expect(currentQuery()).toBe('rs:fir');
      clickElem(1);
      expect(currentQuery()).toBe('nu:fir');
      clickElem(1);
      expect(currentQuery()).toBe('rp:fir');
      clickElem(1);
      expect(currentQuery()).toBe('ab:fir');
      clickElem(1);
      expect(currentQuery()).toBe('');
    });

    it('combines element clicks with text already typed', () => {
      search('jack');
      clickElem(1);
      expect(currentQuery()).toBe('wk:fir jack');
      expect(visibleNames()).toEqual(['Jack Frost']);
    });

    it('rehydrates the panel from a query typed by hand', () => {
      search('nu:ele');
      const state = elemToggles()[3].querySelector('.state').textContent.trim();
      expect(state).toBe('nu');
    });

    it('lists only the races actually present', () => {
      const races = Array.from<HTMLOptionElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header select option'))
        .map(opt => opt.textContent.trim());
      expect(races).toEqual(['Any', 'Fairy', 'Deity']);
    });

    it('clears every filter with the clear button', () => {
      search('jack');
      clickElem(1);
      const clear = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header .filter-panel button'))
        .find(b => b.textContent.trim() === 'Clear filters');
      clear.click();
      fixture.detectChanges();
      expect(currentQuery()).toBe('');
      expect(visibleNames().length).toBe(3);
    });
  });

  describe('sort reset', () => {
    function clickResetSort() {
      Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header .filter-panel button'))
        .find(b => b.textContent.trim() === 'Reset sort').click();
      fixture.detectChanges();
    }

    function clickColumn(index: number) {
      fixture.nativeElement.querySelectorAll('.sticky-header th.sortable')[index].click();
      fixture.detectChanges();
    }

    it('restores the default row order after sorting by a column', () => {
      const original = columnNames();
      expect(original).toEqual(['Jack Frost', 'Pixie', 'Odin']);

      clickColumn(2);
      expect(columnNames()).toEqual(['Jack Frost', 'Odin', 'Pixie']);

      clickResetSort();
      expect(columnNames()).toEqual(original);
    });

    it('clears the sort direction arrows', () => {
      clickColumn(2);
      expect(fixture.nativeElement.querySelectorAll(
        '.sticky-header th.sortable.asc, .sticky-header th.sortable.desc').length).toBe(1);

      clickResetSort();
      expect(fixture.nativeElement.querySelectorAll(
        '.sticky-header th.sortable.asc, .sticky-header th.sortable.desc').length).toBe(0);
    });
  });

  describe('owned demons', () => {
    function stars(): HTMLButtonElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('tbody tr .own-star'));
    }

    function markOwned(index: number) {
      stars()[index].click();
      fixture.detectChanges();
    }

    it('shows a star on every row, unmarked to begin with', () => {
      expect(stars().length).toBe(3);
      expect(stars().every(s => s.classList.contains('not-owned'))).toBe(true);
    });

    it('marks a demon as owned when its star is clicked', () => {
      markOwned(0);
      expect(stars()[0].classList.contains('owned')).toBe(true);
      expect(stars()[1].classList.contains('not-owned')).toBe(true);
    });

    it('unmarks it when clicked again', () => {
      markOwned(0);
      markOwned(0);
      expect(stars()[0].classList.contains('not-owned')).toBe(true);
    });

    it('filters down to what you own', () => {
      markOwned(0);
      search('have:yes');
      expect(visibleNames()).toEqual(['Jack Frost']);
    });

    it('filters to what you are missing', () => {
      markOwned(0);
      search('have:no');
      expect(visibleNames().sort()).toEqual(['Odin', 'Pixie']);
    });

    it('leaves the star out of a persona list', () => {
      fixture.componentRef.setInput('isPersona', true);
      fixture.detectChanges();

      expect(stars().length).toBe(0);
      expect(visibleNames().length).toBe(3);
    });

    it('leaves the star out of an enemy list', () => {
      fixture.componentRef.setInput('isEnemy', true);
      fixture.detectChanges();

      expect(stars().length).toBe(0);
    });

    it('keeps the name link when there is no star', () => {
      fixture.componentRef.setInput('isPersona', true);
      fixture.detectChanges();

      expect(visibleNames().sort()).toEqual(['Jack Frost', 'Odin', 'Pixie']);
    });

    it('re-runs an active have filter when a star is clicked', () => {
      search('have:yes');
      expect(visibleNames().length).toBe(0);

      markOwned(0);
      expect(visibleNames()).toEqual(['Jack Frost']);
    });
  });

  describe('saved filters and keyboard', () => {
    function savedSelect(): HTMLSelectElement {
      return fixture.nativeElement.querySelector('.sticky-header .search-saved');
    }

    function button(label: string): HTMLButtonElement {
      return Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header .search-bar .search-btn'))
        .find(b => b.textContent.trim() === label);
    }

    function saveCurrentAs(name: string) {
      button('Save').click();
      fixture.detectChanges();
      const field = fixture.nativeElement.querySelector('.sticky-header .search-save-row input');
      field.value = name;
      Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header .search-save-row .search-btn'))
        .find(b => b.textContent.trim() === 'Save').click();
      fixture.detectChanges();
    }

    it('offers nothing to save until a filter is typed', () => {
      expect(button('Save')).toBeUndefined();
      expect(savedSelect()).toBeNull();
    });

    it('saves the current filter under a name', () => {
      search('race:fairy');
      saveCurrentAs('Fairies');

      expect(Array.from<HTMLOptionElement>(savedSelect().options).map(o => o.textContent.trim()))
        .toEqual(['Saved…', 'Fairies']);
    });

    it('reapplies a saved filter', () => {
      search('race:fairy');
      saveCurrentAs('Fairies');
      search('');
      expect(visibleNames().length).toBe(3);

      const select = savedSelect();
      select.value = 'Fairies';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(currentQuery()).toBe('race:fairy');
      expect(visibleNames().sort()).toEqual(['Jack Frost', 'Pixie']);
    });

    it('offers to forget a filter that is already saved', () => {
      search('race:fairy');
      saveCurrentAs('Fairies');

      expect(button('Save')).toBeUndefined();
      button('Unsave').click();
      fixture.detectChanges();

      expect(savedSelect()).toBeNull();
    });

    it('clears the query when Escape is pressed', () => {
      search('jack');
      expect(visibleNames().length).toBe(1);

      searchInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(currentQuery()).toBe('');
      expect(visibleNames().length).toBe(3);
    });
  });

  describe('my level', () => {
    function myLvlInput(): HTMLInputElement {
      return Array.from<HTMLInputElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header .filter-panel input[type=number]'))
        .find(input => input.getAttribute('placeholder') !== 'min'
          && input.getAttribute('placeholder') !== 'max');
    }

    it('has a My lvl field', () => {
      expect(myLvlInput()).toBeTruthy();
    });

    it('records what you type', () => {
      const input = myLvlInput();
      input.value = '40';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(TestBed.inject(PlayerStateService).lvl$()).toBe(40);
    });

    function dimmed(): string[] {
      return Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('tbody tr.over-lvl'))
        .map(row => row.querySelectorAll('td')[2].querySelector('a').textContent.trim());
    }

    it('dims nothing until a level is set', () => {
      expect(dimmed()).toEqual([]);
    });

    it('dims the demons above your level', () => {
      const input = myLvlInput();
      input.value = '20';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(dimmed()).toEqual(['Odin']);
    });

    it('still lists them rather than hiding them', () => {
      const input = myLvlInput();
      input.value = '20';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(visibleNames().length).toBe(3);
    });

    it('follows you as you level up', () => {
      const player = TestBed.inject(PlayerStateService);

      player.setLvl(15);
      fixture.detectChanges();
      expect(dimmed().sort()).toEqual(['Jack Frost', 'Odin']);

      player.setLvl(90);
      fixture.detectChanges();
      expect(dimmed()).toEqual([]);
    });

    it('shows the level back in the field', () => {
      TestBed.inject(PlayerStateService).setLvl(33);
      fixture.detectChanges();

      expect(myLvlInput().value).toBe('33');
    });
  });

  describe('extra resistance columns', () => {
    function panelButton(label: string): HTMLButtonElement {
      return Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.sticky-header .filter-panel button'))
        .find(b => b.textContent.trim() === label);
    }

    function firstRowCells(): string[] {
      return Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('tbody tr:first-child td'))
        .map(td => td.textContent.trim());
    }

    it('offers both toggles when the data carries that information', () => {
      expect(panelButton('Multipliers')).toBeTruthy();
      expect(panelButton('Ailments')).toBeTruthy();
    });

    it('shows the wk/nu codes until multipliers are turned on', () => {
      expect(firstRowCells()).toContain('wk');
      expect(firstRowCells()).not.toContain('125%');
    });

    it('swaps the codes for the real multipliers', () => {
      panelButton('Multipliers').click();
      fixture.detectChanges();

      const cells = firstRowCells();
      expect(cells).toContain('125%');
      expect(cells).toContain('100%');
      expect(cells).not.toContain('wk');
    });

    it('hides the ailment columns until they are asked for', () => {
      expect(fixture.nativeElement.querySelectorAll('.sticky-header div.ailment-icon').length).toBe(0);
    });

    it('adds one ailment column per header when turned on', () => {
      panelButton('Ailments').click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.sticky-header div.ailment-icon').length)
        .toBe(AILMENT_HEADERS.length);
    });

    function searchSpan(): number {
      return Number(fixture.nativeElement
        .querySelector('.sticky-header .search-cell').getAttribute('colspan'));
    }

    function bodyColumns(): number {
      return fixture.nativeElement.querySelectorAll('tbody tr:first-child td').length;
    }

    it('spans the search row across every column', () => {
      expect(searchSpan()).toBe(bodyColumns());
    });

    it('keeps the search row spanning every column after adding ailments', () => {
      panelButton('Ailments').click();
      fixture.detectChanges();

      expect(searchSpan()).toBe(bodyColumns());
    });

    it('shrinks it back when the ailment columns go away', () => {
      panelButton('Ailments').click();
      fixture.detectChanges();
      const withAilments = searchSpan();

      panelButton('Ailments').click();
      fixture.detectChanges();

      expect(searchSpan()).toBeLessThan(withAilments);
      expect(searchSpan()).toBe(bodyColumns());
    });

    it('adds the ailment cells to every row', () => {
      const before = firstRowCells().length;
      panelButton('Ailments').click();
      fixture.detectChanges();

      expect(firstRowCells().length).toBe(before + AILMENT_HEADERS.length);
    });
  });

  it('keeps all rows visible when the query only has unknown filters', () => {
    search('bogus:thing');
    expect(visibleNames().length).toBe(3);
    expect(fixture.nativeElement.querySelector('.sticky-header .search-note').textContent)
      .toContain('bogus:thing');
  });
});
