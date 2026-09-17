import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Skill } from '../models';
import { SmtSkillListRowComponent } from './smt-skill-list.component';

function skill(learnedBy: { demon: string, level: number }[]): Skill {
  return {
    name: 'Agi', element: 'fir', cost: 4, effect: 'Light fire damage',
    rank: 1, level: 0, target: 'Single', learnedBy
  } as Skill;
}

describe('SmtSkillListRowComponent learned-by column', () => {
  let fixture: ComponentFixture<SmtSkillListRowComponent>;

  function render(learnedBy: { demon: string, level: number }[], lvls: { [d: string]: number }) {
    fixture.componentRef.setInput('data', skill(learnedBy));
    fixture.componentRef.setInput('demonLvls', lvls);
    fixture.detectChanges();
  }

  function chips(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.learned'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmtSkillListRowComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SmtSkillListRowComponent);
  });

  it('gives each demon its own chip instead of one long line', () => {
    render([{ demon: 'Pixie', level: 5 }, { demon: 'Jack Frost', level: 1 }], { Pixie: 12, 'Jack Frost': 17 });

    expect(chips().length).toBe(2);
    expect(fixture.nativeElement.querySelector('.comma-list')).toBeNull();
  });

  it('shows the level of the demon itself', () => {
    render([{ demon: 'Pixie', level: 5 }], { Pixie: 12 });

    expect(chips()[0].querySelector('.dlvl').textContent.trim()).toBe('Lv12');
  });

  it('shows the level the skill is learned at', () => {
    render([{ demon: 'Pixie', level: 5 }], { Pixie: 12 });

    expect(chips()[0].querySelector('.slvl').textContent.trim()).toBe('at 5');
  });

  it('says innate rather than leaving it blank', () => {
    render([{ demon: 'Jack Frost', level: 0 }], { 'Jack Frost': 17 });

    const slvl = chips()[0].querySelector('.slvl');
    expect(slvl.textContent.trim()).toBe('innate');
    expect(slvl.classList.contains('innate')).toBe(true);
  });

  it('leaves out the demon level when it is not known', () => {
    render([{ demon: 'Mystery', level: 5 }], {});

    expect(chips()[0].querySelector('.dlvl')).toBeNull();
    expect(chips()[0].querySelector('.slvl').textContent.trim()).toBe('at 5');
  });

  it('still links through to the demon', () => {
    render([{ demon: 'Pixie', level: 5 }], { Pixie: 12 });

    expect(chips()[0].querySelector('a').textContent.trim()).toBe('Pixie');
  });
});
