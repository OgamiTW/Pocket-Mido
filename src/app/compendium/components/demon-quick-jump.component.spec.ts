import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

import { Demon } from '../models';
import { PlayerStateService } from '../../shared/player/player-state.service';
import { DemonQuickJumpComponent } from './demon-quick-jump.component';

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

describe('DemonQuickJumpComponent', () => {
  let fixture: ComponentFixture<DemonQuickJumpComponent>;
  let navigated: any[];

  beforeEach(async () => {
    navigated = [];
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [DemonQuickJumpComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const router = TestBed.inject(Router);
    (router as any).navigate = (commands: any[], extras: any) => {
      navigated.push({ commands, relativeTo: extras && extras.relativeTo });
      return Promise.resolve(true);
    };

    fixture = TestBed.createComponent(DemonQuickJumpComponent);
    fixture.componentRef.setInput('demons', DEMONS);
    fixture.componentRef.setInput('current', 'Pixie');
    fixture.detectChanges();
  });

  it('shows the demon you are looking at', () => {
    expect(fixture.nativeElement.querySelector('input.picker-field').value).toBe('Pixie');
  });

  it('navigates to the sibling entry when another demon is picked', () => {
    fixture.componentInstance.jumpTo('Jack Frost');

    expect(navigated.length).toBe(1);
    expect(navigated[0].commands).toEqual(['../', 'Jack Frost']);
    expect(navigated[0].relativeTo).toBe(TestBed.inject(ActivatedRoute));
  });

  it('does nothing when the current demon is picked again', () => {
    fixture.componentInstance.jumpTo('Pixie');
    expect(navigated.length).toBe(0);
  });

  it('ignores an empty pick', () => {
    fixture.componentInstance.jumpTo('');
    expect(navigated.length).toBe(0);
  });

  it('jumps when a demon is chosen through the picker', () => {
    const field = fixture.nativeElement.querySelector('input.picker-field');
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    field.value = 'jack';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(navigated[0].commands).toEqual(['../', 'Jack Frost']);
  });
});


describe('DemonQuickJumpComponent recent block', () => {
  let fixture: ComponentFixture<DemonQuickJumpComponent>;

  function show(name: string) {
    fixture.componentRef.setInput('current', name);
    fixture.detectChanges();
  }

  function pills(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.recent-row .pill'))
      .map(pill => pill.textContent.trim());
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [DemonQuickJumpComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DemonQuickJumpComponent);
    fixture.componentRef.setInput('demons', DEMONS);
    fixture.componentRef.setInput('current', 'Pixie');
    fixture.detectChanges();
  });

  it('offers no fuse button unless the game has a generator', () => {
    expect(fixture.nativeElement.querySelector('.fuse-btn')).toBeNull();
  });

  it('offers the fuse button when the game has one', () => {
    fixture.componentRef.setInput('canFuse', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fuse-btn').textContent.trim())
      .toBe('I want to fuse it');
  });

  it('sends the demon as the target of the recipe generator', () => {
    fixture.componentRef.setInput('canFuse', true);
    fixture.componentRef.setInput('current', 'Jack Frost');
    fixture.detectChanges();

    const href = fixture.nativeElement.querySelector('.fuse-btn').getAttribute('href');

    expect(href).toContain('recipes');
    expect(decodeURIComponent(href)).toContain('target=Jack Frost');
  });

  it('keeps the fuse button beside the jump control', () => {
    fixture.componentRef.setInput('canFuse', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.jump-row .fuse-btn')).toBeTruthy();
  });

  it('shows no recent block with nowhere else to go', () => {
    expect(fixture.nativeElement.querySelector('.recent-row')).toBeNull();
  });

  it('sits inside the same panel as the jump control', () => {
    show('Jack Frost');

    const panel = fixture.nativeElement.querySelector('.jump-panel');
    expect(panel.querySelector('.jump-row')).toBeTruthy();
    expect(panel.querySelector('.recent-row')).toBeTruthy();
  });

  it('comes after the jump control, not before it', () => {
    show('Jack Frost');

    const rows = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.jump-panel > div')).map(row => row.className);

    expect(rows).toEqual(['jump-row', 'recent-row']);
  });

  it('never clips the panel, which would cut off the jump dropdown', () => {
    show('Jack Frost');

    const panel = fixture.nativeElement.querySelector('.jump-panel');
    const overflow = getComputedStyle(panel).overflow;

    expect(overflow === 'hidden' || overflow === 'clip').toBe(false);
  });

  it('keeps the whole dropdown inside the document when open', () => {
    show('Jack Frost');

    const field = fixture.nativeElement.querySelector('input.picker-field');
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('.picker-panel, .picker-list');
    expect(list).toBeTruthy();

    // Walk up to and including the panel: nothing may clip the dropdown away.
    let node = list.parentElement;
    let reachedPanel = false;

    while (node && !reachedPanel) {
      reachedPanel = node.classList.contains('jump-panel');

      const overflow = getComputedStyle(node).overflow;
      expect(overflow === 'hidden' || overflow === 'clip').toBe(false);
      node = node.parentElement;
    }

    expect(reachedPanel).toBe(true);
  });

  it('lists the demons you looked at before', () => {
    show('Jack Frost');
    expect(pills()).toEqual(['Pixie']);

    show('Odin');
    expect(pills()).toEqual(['Jack Frost', 'Pixie']);
  });

  it('leaves out the one you are looking at', () => {
    show('Jack Frost');
    show('Odin');

    expect(pills()).not.toContain('Odin');
  });

  it('puts the most recent first', () => {
    show('Jack Frost');
    show('Odin');
    show('Pixie');

    expect(pills()).toEqual(['Odin', 'Jack Frost']);
  });

  it('records each demon once, however often you visit', () => {
    show('Jack Frost');
    show('Pixie');
    show('Jack Frost');

    expect(TestBed.inject(PlayerStateService).recent$().filter(n => n === 'Pixie').length).toBe(1);
  });
});
