import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpoilerComponent } from './spoiler.component';

@Component({
  imports: [SpoilerComponent],
  template: `<app-spoiler [label]="label()">Fuse with a Fiend on a new moon</app-spoiler>`
})
class HostComponent {
  label = signal('Special Fusion Condition');
}

describe('SpoilerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  function root(): HTMLElement {
    return fixture.nativeElement.querySelector('.spoiler');
  }

  function veil(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.veil');
  }

  function click() {
    veil().click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('starts hidden', () => {
    expect(root().classList.contains('hidden')).toBe(true);
    expect(root().classList.contains('shown')).toBe(false);
  });

  it('invites you to reveal it', () => {
    expect(fixture.nativeElement.querySelector('.prompt').textContent).toContain('click to reveal');
  });

  it('keeps the text in the page rather than removing it', () => {
    expect(fixture.nativeElement.textContent).toContain('Fuse with a Fiend on a new moon');
  });

  it('marks the content hidden from assistive tech while veiled', () => {
    expect(fixture.nativeElement.querySelector('.content').getAttribute('aria-hidden')).toBe('true');
    expect(veil().getAttribute('aria-expanded')).toBe('false');
  });

  it('reveals on click', () => {
    click();

    expect(root().classList.contains('shown')).toBe(true);
    expect(fixture.nativeElement.querySelector('.prompt')).toBeNull();
    expect(veil().getAttribute('aria-expanded')).toBe('true');
  });

  it('hides again on a second click', () => {
    click();
    click();

    expect(root().classList.contains('hidden')).toBe(true);
    expect(fixture.nativeElement.querySelector('.prompt')).toBeTruthy();
  });

  it('shows the label when one is given', () => {
    expect(fixture.nativeElement.querySelector('.label').textContent.trim())
      .toBe('Special Fusion Condition');
  });

  it('leaves the label out when there is none', () => {
    fixture.componentInstance.label.set('');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.label')).toBeNull();
  });
});
