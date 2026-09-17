import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlayerStateService } from '../../shared/player/player-state.service';

import { Demon } from '../models';
import { DemonPickerComponent, filterDemons } from './demon-picker.component';

function demon(name: string, race: string, lvl: number): Demon {
  return {
    race, lvl, currLvl: lvl, name, price: 0, inherits: 0, stats: [], resists: [],
    fusion: 'normal', skills: {}, searchTags: [name, race].join(',').toLocaleLowerCase()
  };
}

const DEMONS = [
  demon('Pixie', 'Fairy', 12),
  demon('Jack Frost', 'Fairy', 17),
  demon('Odin', 'Deity', 78)
];

describe('filterDemons', () => {
  it('returns everything when nothing is typed', () => {
    expect(filterDemons(DEMONS, '')).toEqual(DEMONS);
  });

  it('matches name or race', () => {
    expect(filterDemons(DEMONS, 'jack').map(d => d.name)).toEqual(['Jack Frost']);
    expect(filterDemons(DEMONS, 'fairy').map(d => d.name)).toEqual(['Pixie', 'Jack Frost']);
  });

  it('requires every word and honours exclusion', () => {
    expect(filterDemons(DEMONS, 'fairy jack').map(d => d.name)).toEqual(['Jack Frost']);
    expect(filterDemons(DEMONS, '-fairy').map(d => d.name)).toEqual(['Odin']);
  });
});

describe('DemonPickerComponent', () => {
  let fixture: ComponentFixture<DemonPickerComponent>;
  let picked: string[];

  function field(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input.picker-field');
  }

  function options(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.picker-list li'))
      .map(li => Array.from<HTMLElement>(li.querySelectorAll('.lvl, .race, .name, .count'))
        .map(span => span.textContent.trim())
        .join(' ')
        .trim() || li.textContent.trim());
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

  function activeOption(): string {
    const active = fixture.nativeElement.querySelector('.picker-list li.active');
    return active ? active.querySelector('.name').textContent.trim() : '';
  }

  beforeEach(async () => {
    picked = [];
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DemonPickerComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DemonPickerComponent);
    fixture.componentRef.setInput('demons', DEMONS);
    fixture.componentRef.setInput('selected', 'Pixie');
    fixture.detectChanges();
    fixture.componentInstance.picked.subscribe(name => picked.push(name));
  });

  it('shows the current selection when closed', () => {
    expect(field().value).toBe('Pixie');
    expect(options()).toEqual([]);
  });

  it('opens the list on focus', () => {
    focus();
    expect(options().length).toBe(3);
  });

  it('shows level and race alongside the name', () => {
    focus();
    expect(options()[0]).toBe('12 Fairy Pixie');
    expect(options()[2]).toBe('78 Deity Odin');
  });

  it('narrows the list as you type', () => {
    focus();
    type('deity');
    expect(options()).toEqual(['78 Deity Odin']);
  });

  it('says so when nothing matches', () => {
    focus();
    type('zzz');
    expect(options()).toEqual(['No match']);
  });

  it('moves the highlight with the arrow keys', () => {
    focus();
    expect(activeOption()).toBe('Pixie');
    key('ArrowDown');
    expect(activeOption()).toBe('Jack Frost');
    key('ArrowDown');
    expect(activeOption()).toBe('Odin');
    key('ArrowUp');
    expect(activeOption()).toBe('Jack Frost');
  });

  it('stops at the ends of the list', () => {
    focus();
    key('ArrowUp');
    expect(activeOption()).toBe('Pixie');
    key('ArrowDown'); key('ArrowDown'); key('ArrowDown');
    expect(activeOption()).toBe('Odin');
  });

  it('picks the highlighted demon with Enter', () => {
    focus();
    key('ArrowDown');
    key('Enter');
    expect(picked).toEqual(['Jack Frost']);
    expect(options()).toEqual([]);
  });

  it('picks what you filtered down to', () => {
    focus();
    type('odin');
    key('Enter');
    expect(picked).toEqual(['Odin']);
  });

  it('closes on Escape without picking anything', () => {
    focus();
    type('odin');
    key('Escape');
    expect(picked).toEqual([]);
    expect(options()).toEqual([]);
    expect(field().value).toBe('Pixie');
  });

  it('opens its list wider than the field so long names fit', () => {
    const styles = (DemonPickerComponent as any).ɵcmp.styles.join(' ');

    expect(styles).toContain('max-content');
    expect(styles).not.toMatch(/\.picker-list[^}]*right:\s*0/);
  });

  it('picks on click', () => {
    focus();
    const option = fixture.nativeElement.querySelectorAll('.picker-list li')[2];
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(picked).toEqual(['Odin']);
  });
});


describe('DemonPickerComponent ownership', () => {
  it('narrows to the demons you have starred', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DemonPickerComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(DemonPickerComponent);
    fixture.componentRef.setInput('demons', DEMONS);
    fixture.componentRef.setInput('selected', 'Pixie');
    fixture.detectChanges();

    TestBed.inject(PlayerStateService).toggleOwned('Odin');
    fixture.detectChanges();

    const field = fixture.nativeElement.querySelector('input.picker-field');
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    field.value = 'have:yes';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const names = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.picker-list li .name'))
      .map(el => el.textContent.trim());

    expect(names).toEqual(['Odin']);
  });

  it('shows a star against every demon in the list', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DemonPickerComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(DemonPickerComponent);
    fixture.componentRef.setInput('demons', DEMONS);
    fixture.componentRef.setInput('selected', 'Pixie');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('input.picker-field').dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.picker-list li .own-star').length).toBe(3);
  });
});

describe('two pickers on the same screen', () => {
  let first: ComponentFixture<DemonPickerComponent>;
  let second: ComponentFixture<DemonPickerComponent>;

  function make(selected: string) {
    const fixture = TestBed.createComponent(DemonPickerComponent);
    fixture.componentRef.setInput('demons', DEMONS);
    fixture.componentRef.setInput('selected', selected);
    fixture.detectChanges();
    return fixture;
  }

  function fieldOf(fixture: ComponentFixture<DemonPickerComponent>): HTMLInputElement {
    return fixture.nativeElement.querySelector('input.picker-field');
  }

  function focus(fixture: ComponentFixture<DemonPickerComponent>) {
    fieldOf(fixture).dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DemonPickerComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    first = make('Pixie');
    second = make('Odin');
  });

  it('closes the first dropdown when the second opens', () => {
    focus(first);
    expect(first.componentInstance.open()).toBe(true);

    focus(second);
    first.detectChanges();

    expect(second.componentInstance.open()).toBe(true);
    expect(first.componentInstance.open()).toBe(false);
  });

  it('closes when focus moves into a different picker', () => {
    focus(first);

    fieldOf(first).dispatchEvent(new FocusEvent('focusout', { relatedTarget: fieldOf(second), bubbles: true }));
    first.detectChanges();

    expect(first.componentInstance.open()).toBe(false);
  });

  it('stays open while focus moves inside its own dropdown', () => {
    focus(first);
    const option = first.nativeElement.querySelector('.picker-list li');

    fieldOf(first).dispatchEvent(new FocusEvent('focusout', { relatedTarget: option, bubbles: true }));
    first.detectChanges();

    expect(first.componentInstance.open()).toBe(true);
  });
});
