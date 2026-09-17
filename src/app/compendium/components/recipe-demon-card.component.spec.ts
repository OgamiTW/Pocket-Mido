import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Compendium, Demon, Skill } from '../models';
import { RecipeDemonCardComponent, cardSkills } from './recipe-demon-card.component';
import { countSlots } from './recipe-generator.component';

const WEAK = 6 << 10;
const NORMAL = 5 << 10;
const NULL = 3 << 10;

const SKILLS: { [name: string]: Partial<Skill> } = {
  Agi:  { element: 'fir', cost: 4, effect: 'Light fire damage' },
  Dia:  { element: 'rec', cost: 5, effect: 'Restores a little HP' },
  Zan:  { element: 'for', cost: 6, effect: '', damage: 'Light' }
};

const COMPENDIUM = {
  getSkill: (name: string) => SKILLS[name]
    ? Object.assign({ name, rank: 1, level: 0, learnedBy: [] }, SKILLS[name]) as Skill
    : null
} as Compendium;

const PIXIE: Demon = {
  race: 'Fairy', lvl: 12, currLvl: 12, name: 'Pixie', price: 0, inherits: 0,
  stats: [], resists: [NORMAL, WEAK, NULL], fusion: 'normal',
  skills: { Dia: 5, Agi: 1, Zan: 9 }, searchTags: ''
};

describe('cardSkills', () => {
  it('returns nothing without a demon or compendium', () => {
    expect(cardSkills(null, COMPENDIUM)).toEqual([]);
    expect(cardSkills(PIXIE, null)).toEqual([]);
  });

  it('orders skills by the level they are learned at', () => {
    expect(cardSkills(PIXIE, COMPENDIUM).map(e => e.skill.name)).toEqual(['Agi', 'Dia', 'Zan']);
    expect(cardSkills(PIXIE, COMPENDIUM).map(e => e.level)).toEqual([1, 5, 9]);
  });

  it('drops skills the compendium does not know', () => {
    const odd = Object.assign({}, PIXIE, { skills: { Agi: 1, Bogus: 2 } });
    expect(cardSkills(odd, COMPENDIUM).map(e => e.skill.name)).toEqual(['Agi']);
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

  it('reports a full chain', () => {
    expect(countSlots([
      { disabled: false, elem: '-', skill: 'Agi', demon: 'Pixie' },
      { disabled: false, elem: '-', skill: 'Dia', demon: 'Pixie' }
    ])).toEqual({ used: 2, total: 2 });
  });
});

describe('RecipeDemonCardComponent', () => {
  let fixture: ComponentFixture<RecipeDemonCardComponent>;

  function show(demon: Demon) {
    fixture.componentRef.setInput('demon', demon);
    fixture.componentRef.setInput('compendium', COMPENDIUM);
    fixture.componentRef.setInput('resistHeaders', ['phy', 'fir', 'ice']);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecipeDemonCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(RecipeDemonCardComponent);
  });

  it('shows nothing for the blank demon', () => {
    show(Object.assign({}, PIXIE, { name: '-' }));
    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
  });

  it('shows level, race and name', () => {
    show(PIXIE);
    expect(fixture.nativeElement.querySelector('.card-head .lvl').textContent.trim()).toBe('Lvl 12');
    expect(fixture.nativeElement.querySelector('.card-head .race').textContent.trim()).toBe('Fairy');
    expect(fixture.nativeElement.querySelector('.card-head .name').textContent.trim()).toBe('Pixie');
  });

  it('shows one resistance per column, with its affinity', () => {
    show(PIXIE);
    const res = fixture.nativeElement.querySelectorAll('.resists .res');
    expect(res.length).toBe(3);
    expect(res[1].querySelector('.reslvl').textContent.trim()).toBe('wk');
    expect(res[2].querySelector('.reslvl').textContent.trim()).toBe('nu');
  });

  it('lists every skill with the level it is learned at', () => {
    show(PIXIE);
    const skills = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.skills .skill'));
    expect(skills.map(s => s.querySelector('.sname').textContent.trim())).toEqual(['Agi', 'Dia', 'Zan']);
    expect(skills.map(s => s.querySelector('.slvl').textContent.trim())).toEqual(['Innate', '5', '9']);
  });

  it('puts the skill effect in its own styled tooltip, not the browser one', () => {
    show(PIXIE);
    const skills = fixture.nativeElement.querySelectorAll('.skills .skill');

    expect(skills[0].getAttribute('data-tip')).toBe('Agi: Light fire damage');
    expect(skills[0].getAttribute('title')).toBeNull();
    expect(skills[0].classList.contains('tip')).toBe(true);
  });

  it('describes a damage skill that has no effect text', () => {
    show(PIXIE);
    const skills = fixture.nativeElement.querySelectorAll('.skills .skill');
    expect(skills[2].getAttribute('data-tip')).toBe('Zan: Light for damage');
  });

  it('names the affinity in the resistance tooltip', () => {
    show(PIXIE);
    const res = fixture.nativeElement.querySelectorAll('.resists .res');

    expect(res[1].getAttribute('data-tip')).toContain('weak');
    expect(res[2].getAttribute('data-tip')).toContain('nulls');
    expect(res[1].getAttribute('title')).toBeNull();
  });

  it('separates the header and the resistances with a rule', () => {
    show(PIXIE);
    const styles = (RecipeDemonCardComponent as any).ɵcmp.styles.join(' ');

    expect(styles).toContain('border-bottom');
  });
});
