import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Compendium, Skill } from '../models';
import { DemonSkillsComponent } from './demon-skills.component';

const SKILLS: { [name: string]: Partial<Skill> } = {
  Agi:      { element: 'fir', cost: 4, effect: 'Light fire damage' },
  Agilao:   { element: 'fir', cost: 10, effect: 'Medium fire damage' },
  Bufu:     { element: 'ice', cost: 4, effect: 'Light ice damage' },
  Bufula:   { element: 'ice', cost: 10, effect: 'Medium ice damage' },
  Zio:      { element: 'ele', cost: 4, effect: 'Light elec damage' },
  Zionga:   { element: 'ele', cost: 10, effect: 'Medium elec damage' },
  Dia:      { element: 'rec', cost: 5, effect: 'Restores a little HP' },
  Diarama:  { element: 'rec', cost: 12, effect: 'Restores HP' },
  Tarukaja: { element: 'sup', cost: 8, effect: 'Raises attack' },
  Rakukaja: { element: 'sup', cost: 8, effect: 'Raises defence' }
};

const COMPENDIUM = {
  getSkill: (name: string) => Object.assign({ name, rank: 1, level: 0, learnedBy: [] }, SKILLS[name]) as Skill
} as Compendium;

const ELEM_ORDER = { fir: 0, ice: 1, ele: 2, rec: 3, sup: 4 };

describe('DemonSkillsComponent', () => {
  let fixture: ComponentFixture<DemonSkillsComponent>;

  function setSkills(names: string[]) {
    const levels = names.reduce((acc, name, i) => { acc[name] = i + 1; return acc; }, {});
    fixture.componentRef.setInput('compendium', COMPENDIUM);
    fixture.componentRef.setInput('elemOrder', ELEM_ORDER);
    fixture.componentRef.setInput('skillLevels', levels);
    fixture.detectChanges();
  }

  function rows(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr.app-smt-skill-list-row'))
      .map(row => row.querySelectorAll('td')[1].textContent.trim());
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemonSkillsComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DemonSkillsComponent);
  });

  it('lists every skill the demon learns', () => {
    setSkills(Object.keys(SKILLS));
    expect(rows().length).toBe(10);
  });

  it('has no search box: a single demon list is short enough to read', () => {
    setSkills(Object.keys(SKILLS));
    expect(fixture.nativeElement.querySelector('input.search-input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.search-cell')).toBeNull();
  });

  it('has no search box for a short list either', () => {
    setSkills(['Agi', 'Bufu', 'Zio']);
    expect(fixture.nativeElement.querySelector('input.search-input')).toBeNull();
    expect(rows().length).toBe(3);
  });

  it('orders skills by the level they are learned at', () => {
    setSkills(['Tarukaja', 'Agi', 'Bufu']);
    expect(rows()).toEqual(['Tarukaja', 'Agi', 'Bufu']);
  });

  it('says so when the demon learns nothing', () => {
    setSkills([]);
    expect(rows().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No');
  });
});
