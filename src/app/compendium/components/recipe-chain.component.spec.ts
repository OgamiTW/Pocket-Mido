import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PlayerStateService } from '../../shared/player/player-state.service';
import {
  RecipeChainComponent, chainPeakLvl, decodeRecipeChain, splitIngredient, stepRecipe
} from './recipe-chain.component';

const SKILL_REF = { Porewit: ['Agi'], Sudama: [] };
const LVLS = {
  Porewit: 7, Sudama: 3, 'Shan Xiao': 11, Onmoraki: 40, Efreet: 45,
  Vivian: 52, 'White Rider': 66, Inferno: 45, 'Red Rider': 91
};
const getLvl = (name: string) => LVLS[name] || 0;

describe('decodeRecipeChain', () => {
  it('returns nothing for an empty or too-short chain', () => {
    expect(decodeRecipeChain([], {})).toEqual([]);
    expect(decodeRecipeChain(null, {})).toEqual([]);
    expect(decodeRecipeChain(['Porewit', 'Sudama'], {})).toEqual([]);
  });

  it('turns a flat chain into one step per fusion, with levels', () => {
    const steps = decodeRecipeChain(['Porewit', 'Sudama', 'Shan Xiao'], SKILL_REF, getLvl);

    expect(steps.length).toBe(1);
    expect(steps[0]).toEqual({
      step: 1,
      left: { parts: [{ name: 'Porewit', lvl: 7, skills: ['Agi'] }] },
      right: { parts: [{ name: 'Sudama', lvl: 3, skills: [] }] },
      result: { parts: [{ name: 'Shan Xiao', lvl: 11, skills: [] }] }
    });
  });

  it('feeds each result into the next step', () => {
    const steps = decodeRecipeChain(
      ['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet'], SKILL_REF, getLvl);

    expect(steps.length).toBe(2);
    expect(steps[1].left.parts[0].name).toBe('Shan Xiao');
    expect(steps[1].result.parts).toEqual([{ name: 'Efreet', lvl: 45, skills: [] }]);
  });

  it('falls back to level zero when no lookup is given', () => {
    expect(decodeRecipeChain(['Porewit', 'Sudama', 'Shan Xiao'], SKILL_REF)[0].left.parts[0].lvl).toBe(0);
  });
});

describe('special fusions needing three ingredients', () => {
  // One chain entry can hold several demons joined by " x ".
  const CHAIN = ['Vivian', 'White Rider x Inferno', 'Red Rider'];

  it('splits the slot into one demon per part', () => {
    const steps = decodeRecipeChain(CHAIN, SKILL_REF, getLvl);

    expect(steps[0].left.parts.map(p => p.name)).toEqual(['Vivian']);
    expect(steps[0].right.parts.map(p => p.name)).toEqual(['White Rider', 'Inferno']);
  });

  it('gives each of them its own level instead of zero', () => {
    const steps = decodeRecipeChain(CHAIN, SKILL_REF, getLvl);

    expect(steps[0].right.parts.map(p => p.lvl)).toEqual([66, 45]);
  });

  it('counts the grouped demons towards the level the chain needs', () => {
    expect(chainPeakLvl(decodeRecipeChain(CHAIN, SKILL_REF, getLvl))).toBe(66);
  });

  it('ignores stray separators', () => {
    expect(splitIngredient('White Rider x Inferno')).toEqual(['White Rider', 'Inferno']);
    expect(splitIngredient('')).toEqual([]);
    expect(splitIngredient(null)).toEqual([]);
  });
});

describe('stepRecipe', () => {
  it('turns a plain step into a saveable plan', () => {
    const [step] = decodeRecipeChain(['Porewit', 'Sudama', 'Shan Xiao'], SKILL_REF, getLvl);

    expect(stepRecipe(step)).toEqual({ a: 'Porewit', b: 'Sudama', result: 'Shan Xiao' });
  });

  it('refuses a step whose slot holds several demons', () => {
    const [step] = decodeRecipeChain(
      ['Vivian', 'White Rider x Inferno', 'Red Rider'], SKILL_REF, getLvl);

    expect(stepRecipe(step)).toBeNull();
  });
});

describe('chainPeakLvl', () => {
  it('reports the highest ingredient level in the chain', () => {
    const steps = decodeRecipeChain(
      ['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet'], SKILL_REF, getLvl);

    expect(chainPeakLvl(steps)).toBe(40);
  });

  it('is zero for no steps', () => {
    expect(chainPeakLvl([])).toBe(0);
    expect(chainPeakLvl(null)).toBe(0);
  });
});

describe('RecipeChainComponent', () => {
  let fixture: ComponentFixture<RecipeChainComponent>;

  function render(chain: string[]) {
    fixture.componentRef.setInput('steps', decodeRecipeChain(chain, SKILL_REF, getLvl));
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.chain li'));
  }

  function setPlayerLvl(lvl: number) {
    TestBed.inject(PlayerStateService).setLvl(lvl);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RecipeChainComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(RecipeChainComponent);
  });

  it('says so when there is nothing to show', () => {
    fixture.componentRef.setInput('steps', []);
    fixture.componentRef.setInput('emptyText', 'No recipes found');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty').textContent.trim()).toBe('No recipes found');
  });

  it('shows the level of every participant', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);
    const lvls = Array.from<HTMLElement>(rows()[0].querySelectorAll('.lvl')).map(l => l.textContent.trim());

    expect(lvls).toEqual(['Lvl 7', 'Lvl 3', 'Lvl 11']);
  });

  it('renders a three-ingredient fusion as separate demons', () => {
    render(['Vivian', 'White Rider x Inferno', 'Red Rider']);
    const names = Array.from<HTMLElement>(rows()[0].querySelectorAll('.demon'))
      .map(d => d.textContent.trim());

    expect(names).toEqual(['Vivian', 'White Rider', 'Inferno', 'Red Rider']);
    expect(rows()[0].textContent).not.toContain('White Rider x Inferno');
  });

  it('never shows level zero for a grouped ingredient', () => {
    render(['Vivian', 'White Rider x Inferno', 'Red Rider']);
    const lvls = Array.from<HTMLElement>(rows()[0].querySelectorAll('.lvl'))
      .map(l => l.textContent.trim());

    expect(lvls).toEqual(['Lvl 52', 'Lvl 66', 'Lvl 45', 'Lvl 91']);
  });

  it('brackets the grouped demons so they read as one slot', () => {
    render(['Vivian', 'White Rider x Inferno', 'Red Rider']);

    const multi = rows()[0].querySelectorAll('.group.multi');
    expect(multi.length).toBe(1);
    expect(multi[0].querySelectorAll('.demon').length).toBe(2);
    expect(rows()[0].querySelector('.plus').textContent.trim()).toBe('+');
  });

  it('reads as ingredient x ingredient -> result', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);
    const sides = Array.from<HTMLElement>(rows()[0].querySelectorAll('.side'))
      .map(side => `${side.querySelector('.demon').textContent.trim()} ${side.querySelector('.lvl').textContent.trim()}`);

    expect(sides).toEqual(['Porewit Lvl 7', 'Sudama Lvl 3', 'Shan Xiao Lvl 11']);
    expect(rows()[0].querySelector('.op:not(.blank):not(.arrow)').textContent.trim()).toBe('×');
    expect(rows()[0].querySelector('.op.arrow').textContent.trim()).toBe('→');
  });

  it('lets you re-target the generator at any participant', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);

    const links = Array.from<HTMLAnchorElement>(rows()[0].querySelectorAll('a.demon'));
    expect(links.map(a => a.textContent.trim())).toEqual(['Porewit', 'Sudama', 'Shan Xiao']);

    for (const link of links) {
      expect(decodeURIComponent(link.getAttribute('href'))).toContain('target=');
    }
  });

  it('sends the demon you clicked as the new target', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);

    const sudama = Array.from<HTMLAnchorElement>(rows()[0].querySelectorAll('a.demon'))
      .find(a => a.textContent.trim() === 'Sudama');

    expect(decodeURIComponent(sudama.getAttribute('href'))).toContain('target=Sudama');
  });

  it('links each demon of a grouped ingredient separately', () => {
    render(['Vivian', 'White Rider x Inferno', 'Red Rider']);

    const names = Array.from<HTMLAnchorElement>(rows()[0].querySelectorAll('a.demon'))
      .map(a => a.textContent.trim());

    expect(names).toEqual(['Vivian', 'White Rider', 'Inferno', 'Red Rider']);
  });

  it('offers a plan flag on each plain step', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet']);

    expect(fixture.nativeElement.querySelectorAll('.chain li .plan-btn').length).toBe(2);
  });

  it('saves the step as a plan when the flag is clicked', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);

    const flag = fixture.nativeElement.querySelector('.plan-btn');
    expect(flag.classList.contains('on')).toBe(false);

    flag.click();
    fixture.detectChanges();

    expect(flag.classList.contains('on')).toBe(true);
    expect(TestBed.inject(PlayerStateService).hasRecipe(
      { a: 'Porewit', b: 'Sudama', result: 'Shan Xiao' })).toBe(true);
  });

  it('takes it off the plans again', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);

    const flag = fixture.nativeElement.querySelector('.plan-btn');
    flag.click();
    fixture.detectChanges();
    flag.click();
    fixture.detectChanges();

    expect(flag.classList.contains('on')).toBe(false);
  });

  it('leaves a gap instead of a flag on a grouped step', () => {
    render(['Vivian', 'White Rider x Inferno', 'Red Rider']);

    expect(fixture.nativeElement.querySelectorAll('.chain li .plan-btn').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.chain li .plan-gap').length).toBe(1);
  });

  it('marks nothing while no player level is set', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet']);
    expect(fixture.nativeElement.querySelectorAll('.side.over').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.warn')).toBeNull();
  });

  it('marks ingredients above your level in red', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet']);
    setPlayerLvl(20);

    const over = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.side.over'))
      .map(s => s.querySelector('.demon').textContent.trim());

    expect(over).toEqual(['Onmoraki']);
  });

  it('warns which level the chain actually needs', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet']);
    setPlayerLvl(20);

    const warn = fixture.nativeElement.querySelector('.warn').textContent;
    expect(warn).toContain('level 40');
    expect(warn).toContain('you are level 20');
  });

  it('stops warning once your level covers the chain', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao', 'Onmoraki', 'Efreet']);
    setPlayerLvl(60);

    expect(fixture.nativeElement.querySelectorAll('.side.over').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.warn')).toBeNull();
  });

  it('shows carried skills as tags rather than bracketed text', () => {
    render(['Porewit', 'Sudama', 'Shan Xiao']);
    const chips = Array.from<HTMLElement>(rows()[0].querySelectorAll('.chip')).map(c => c.textContent.trim());

    expect(chips).toEqual(['Agi']);
    expect(rows()[0].textContent).not.toContain('[');
  });
});
