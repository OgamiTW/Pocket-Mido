import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Skill } from '../models';
import { SkillPickerComponent, filterSkills } from './skill-picker.component';

function skill(name: string, element: string, cost: number, effect: string): Skill {
  return { name, element, cost, effect, rank: 1, level: 0, learnedBy: [] } as Skill;
}

const SKILLS = [
  skill('Agi', 'fir', 4, 'Light fire damage'),
  skill('Bufu', 'ice', 4, 'Light ice damage'),
  skill('Zionga', 'ele', 10, 'Medium elec damage'),
  skill('Dia', 'rec', 5, 'Restores a little HP')
];

describe('filterSkills', () => {
  it('returns everything when nothing is typed', () => {
    expect(filterSkills(SKILLS, '')).toEqual(SKILLS);
  });

  it('matches name and effect text', () => {
    expect(filterSkills(SKILLS, 'agi').map(s => s.name)).toEqual(['Agi']);
    expect(filterSkills(SKILLS, 'restores').map(s => s.name)).toEqual(['Dia']);
  });

  it('supports the filter syntax', () => {
    expect(filterSkills(SKILLS, 'elem:ice').map(s => s.name)).toEqual(['Bufu']);
    expect(filterSkills(SKILLS, 'cost:<=4').map(s => s.name)).toEqual(['Agi', 'Bufu']);
  });

  it('keeps the list intact when the query is only unknown terms', () => {
    expect(filterSkills(SKILLS, 'bogus:x')).toEqual(SKILLS);
  });
});

describe('SkillPickerComponent', () => {
  let fixture: ComponentFixture<SkillPickerComponent>;
  let picked: string[];

  function field(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input.picker-field');
  }

  function names(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.picker-list li .name'))
      .map(el => el.textContent.trim());
  }

  function focus() {
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  }

  function type(value: string) {
    field().value = value;
    field().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function key(name: string) {
    field().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    picked = [];
    await TestBed.configureTestingModule({ imports: [SkillPickerComponent] }).compileComponents();

    fixture = TestBed.createComponent(SkillPickerComponent);
    fixture.componentRef.setInput('skills', SKILLS);
    fixture.componentRef.setInput('selected', 'Agi');
    fixture.detectChanges();
    fixture.componentInstance.picked.subscribe(name => picked.push(name));
  });

  it('shows the current skill when closed', () => {
    expect(field().value).toBe('Agi');
    expect(names()).toEqual([]);
  });

  it('lists every skill', () => {
    focus();
    expect(names()).toEqual(['Agi', 'Bufu', 'Zionga', 'Dia']);
  });

  it('never leaves a browser tooltip on an option', () => {
    focus();
    const options = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.picker-list li'));

    expect(options.every(li => li.getAttribute('title') === null)).toBe(true);
  });

  it('shows the highlighted skill effect in its own panel', () => {
    focus();
    const tip = fixture.nativeElement.querySelector('.picker-tip');

    expect(tip.querySelector('.tip-name').textContent.trim()).toBe('Agi');
    expect(tip.querySelector('.tip-effect').textContent.trim()).toBe('Light fire damage');
  });

  it('follows the mouse as it moves over the list', () => {
    focus();
    const options = fixture.nativeElement.querySelectorAll('.picker-list li');
    options[2].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.picker-tip .tip-name').textContent.trim()).toBe('Zionga');
  });

  it('follows the keyboard too', () => {
    focus();
    key('ArrowDown');

    expect(fixture.nativeElement.querySelector('.picker-tip .tip-name').textContent.trim()).toBe('Bufu');
  });

  it('keeps the panel outside the scrolling list so it cannot be clipped', () => {
    focus();
    const tip = fixture.nativeElement.querySelector('.picker-tip');

    expect(tip.closest('.picker-list')).toBeNull();
    expect(tip.closest('.picker-panel')).toBeTruthy();
  });

  it('says so when a skill has no description', () => {
    fixture.componentRef.setInput('skills', [
      { name: 'Mystery', element: 'fir', cost: 0, effect: '', rank: 1, level: 0, learnedBy: [] } as any
    ]);
    focus();

    expect(fixture.nativeElement.querySelector('.picker-tip .tip-effect').textContent.trim())
      .toBe('No description');
  });

  it('shows the element icon and cost alongside each skill', () => {
    focus();
    const first = fixture.nativeElement.querySelector('.picker-list li');
    expect(first.querySelector('div.element-icon').classList.contains('fir')).toBe(true);
    expect(first.querySelector('.cost').textContent.trim()).toContain('4');
  });

  it('narrows as you type', () => {
    focus();
    type('elem:ice');
    expect(names()).toEqual(['Bufu']);
  });

  it('picks with Enter after filtering', () => {
    focus();
    type('dia');
    key('Enter');
    expect(picked).toEqual(['Dia']);
  });

  it('navigates with the arrow keys', () => {
    focus();
    key('ArrowDown');
    key('Enter');
    expect(picked).toEqual(['Bufu']);
  });

  it('closes on Escape without picking', () => {
    focus();
    type('dia');
    key('Escape');
    expect(picked).toEqual([]);
    expect(field().value).toBe('Agi');
  });
});
