import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';

import { Compendium, Demon, Skill } from '../models';
import {
  RecipeSkillPickerComponent, SkillLookupMaker, SkillPickModel, BLANK_SKILL
} from './recipe-skill-picker.component';

function skill(name: string, element: string, inherit: string, rank = 1): Skill {
  return { name, element, inherit, rank, cost: 4, effect: name + ' effect',
    target: 'Single', level: 0, learnedBy: [] } as Skill;
}

function demon(name: string, lvl: number, skills: string[]): Demon {
  return {
    race: 'Fairy', lvl, currLvl: lvl, name, price: 0, inherits: 0, stats: [], resists: [],
    fusion: 'normal', searchTags: name.toLocaleLowerCase(),
    skills: skills.reduce((acc, s) => { acc[s] = 1; return acc; }, {})
  };
}

const ALL_SKILLS = [skill('Agi', 'fir', 'fir'), skill('Agilao', 'fir', 'fir'), skill('Bufu', 'ice', 'ice')];
const ALL_DEMONS = [demon('Pixie', 12, ['Agi', 'Bufu']), demon('Jack Frost', 17, ['Bufu']), demon('Efreet', 40, ['Agi', 'Agilao'])];

const COMPENDIUM = {
  allDemons: ALL_DEMONS,
  allSkills: ALL_SKILLS,
  getSkill: (name: string) => ALL_SKILLS.find(s => s.name === name) || BLANK_SKILL,
  getDemon: (name: string) => ALL_DEMONS.find(d => d.name === name) || null
} as unknown as Compendium;

describe('RecipeSkillPickerComponent', () => {
  let fixture: ComponentFixture<RecipeSkillPickerComponent>;
  let model: ReturnType<typeof signal<SkillPickModel>>;

  function build(disabled = false) {
    model = signal<SkillPickModel>({ disabled, elem: 'fir', skill: 'Agi', demon: 'Pixie' });
    const tree = TestBed.runInInjectionContext(() => form(model));
    const maker = new SkillLookupMaker(COMPENDIUM, ['fir', 'ice'], ['fir', 'ice'], false);

    fixture = TestBed.createComponent(RecipeSkillPickerComponent);
    fixture.componentRef.setInput('skillPickForm', tree);
    fixture.componentRef.setInput('skillLookupMaker', maker);
    fixture.componentRef.setInput('skillIs', {
      '-': [BLANK_SKILL],
      fir: [skill('Agi', 'fir', 'fir'), skill('Agilao', 'fir', 'fir')],
      ice: [skill('Bufu', 'ice', 'ice')]
    });
    fixture.componentRef.setInput('displayElems', { fir: 'Fire', ice: 'Ice' });
    fixture.detectChanges();
  }

  function pickers(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input.picker-field'));
  }

  function pickFrom(index: number, text: string) {
    const field = pickers()[index];
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    field.value = text;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecipeSkillPickerComponent] }).compileComponents();
  });

  // Column order in the row: element, skill, source demon.
  const ELEM = 0, SKILL = 1, DEMON = 2;

  it('renders a picker for the element, the skill and its source demon', () => {
    build();
    expect(pickers().length).toBe(3);
    expect(pickers()[ELEM].value).toBe('Fire');
    expect(pickers()[SKILL].value).toBe('Agi');
    expect(pickers()[DEMON].value).toBe('Pixie');
  });

  it('writes the chosen skill back into the form model', () => {
    build();
    pickFrom(SKILL, 'agilao');

    expect(model().skill).toBe('Agilao');
  });

  it('writes the chosen element back into the form model', () => {
    build();
    pickFrom(ELEM, 'ice');

    expect(model().elem).toBe('ice');
  });

  it('writes the chosen source demon back into the form model', () => {
    build();
    expect(pickers()[DEMON].value).toBe('Pixie');
    pickFrom(DEMON, 'efreet');

    expect(model().demon).toBe('Efreet');
  });

  it('only offers demons that actually learn the chosen skill', () => {
    build();
    const field = pickers()[DEMON];
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const offered = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.picker-list li .name')).map(el => el.textContent.trim());

    expect(offered).toEqual(['Pixie', 'Efreet']);
    expect(offered).not.toContain('Jack Frost');
  });

  it('leaves the rest of the pick model untouched when picking a skill', () => {
    build();
    pickFrom(SKILL, 'agilao');

    expect(model().elem).toBe('fir');
    expect(model().disabled).toBe(false);
  });

  it('locks a fixed row instead of offering a picker', () => {
    build(true);

    expect(pickers().length).toBe(0);
    expect(fixture.nativeElement.querySelector('select')).toBeNull();

    const locked = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.locked'))
      .map(el => el.textContent.trim());

    expect(locked).toEqual(['Fire', 'Agi', 'Pixie']);
  });

  it('shows a readable element name with its icon instead of the raw code', () => {
    build();
    const field = pickers()[ELEM];
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.picker-list li'));
    const labels = rows.map(li => li.querySelector('.label').textContent.trim());

    expect(labels).toEqual(['Any', 'Fire', 'Ice']);
    expect(labels).not.toContain('fir');
    expect(rows[1].querySelector('div.element-icon').classList.contains('fir')).toBe(true);
  });

  it('has no native select left in the row', () => {
    build();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });
});
