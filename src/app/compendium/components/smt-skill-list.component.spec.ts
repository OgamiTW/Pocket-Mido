import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Skill } from '../models';
import { SmtSkillListComponent } from './smt-skill-list.component';

const ELEM_ORDER = { fir: 0, ice: 1, ele: 2 };

function skill(name: string, element: string, cost: number, rank: number): Skill {
  return {
    name, element, cost, rank, effect: name + ' effect',
    target: 'Single', level: 0, learnedBy: []
  } as Skill;
}

const SKILLS = [
  skill('Agi', 'fir', 4, 1),
  skill('Bufu', 'ice', 4, 2),
  skill('Zionga', 'ele', 10, 3)
];

describe('SmtSkillListComponent sorting', () => {
  let fixture: ComponentFixture<SmtSkillListComponent>;

  function names(): string[] {
    return Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('tbody tr.app-smt-skill-list-row'))
      .filter(row => !row.classList.contains('hidden'))
      .map(row => row.querySelectorAll('td')[1].textContent.trim());
  }

  function columnHeaders(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.sticky-header th.sortable'));
  }

  function resetButton(): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.sticky-header .skill-filters button'))
      .find(b => b.textContent.trim() === 'Reset sort');
  }

  function arrows(): number {
    return fixture.nativeElement.querySelectorAll(
      '.sticky-header th.sortable.asc, .sticky-header th.sortable.desc').length;
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SmtSkillListComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SmtSkillListComponent);
    fixture.componentRef.setInput('elemOrder', ELEM_ORDER);
    fixture.componentRef.setInput('rowData', SKILLS.slice());
    fixture.detectChanges();
  });

  it('offers a reset button', () => {
    expect(resetButton()).toBeTruthy();
  });

  it('puts the rows back in their default order', () => {
    const original = names();

    columnHeaders()[1].click();
    fixture.detectChanges();

    resetButton().click();
    fixture.detectChanges();

    expect(names()).toEqual(original);
  });

  it('clears the sort direction arrows', () => {
    columnHeaders()[1].click();
    fixture.detectChanges();
    expect(arrows()).toBeGreaterThan(0);

    resetButton().click();
    fixture.detectChanges();
    expect(arrows()).toBe(0);
  });

  it('leaves the filter alone when resetting the sort', () => {
    const input = fixture.nativeElement.querySelector('.sticky-header input.search-input');
    input.value = 'elem:ice';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(names()).toEqual(['Bufu']);

    resetButton().click();
    fixture.detectChanges();

    expect(names()).toEqual(['Bufu']);
    expect(input.value).toBe('elem:ice');
  });
});
