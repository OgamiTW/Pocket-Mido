import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_NAME, APP_VERSION, UPSTREAM_AUTHOR, UPSTREAM_NAME } from './version';
import { WhatsNewComponent } from './whats-new.component';

describe('WhatsNewComponent', () => {
  let fixture: ComponentFixture<WhatsNewComponent>;

  function text(): string {
    return fixture.nativeElement.textContent.replace(/\s+/g, ' ');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsNewComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewComponent);
    fixture.detectChanges();
  });

  it('states the version it is describing', () => {
    expect(fixture.nativeElement.querySelector('.version').textContent.trim())
      .toBe(`Version ${APP_VERSION}`);
  });

  it('names this fork and the original it came from', () => {
    expect(text()).toContain(APP_NAME);
    expect(text()).toContain(UPSTREAM_NAME);
    expect(text()).toContain(UPSTREAM_AUTHOR);
  });

  it('says plainly that the data and fusion maths are not its own', () => {
    expect(text()).toContain('untouched');
  });

  it('groups the changes rather than listing one flat pile', () => {
    const sections = fixture.nativeElement.querySelectorAll('section');
    expect(sections.length).toBeGreaterThan(3);

    for (const section of Array.from<HTMLElement>(sections)) {
      expect(section.querySelector('h3').textContent.trim().length).toBeGreaterThan(0);
      expect(section.querySelectorAll('dt').length).toBeGreaterThan(0);
    }
  });

  it('gives every change a title and an explanation', () => {
    const titles = fixture.nativeElement.querySelectorAll('dt').length;
    const details = fixture.nativeElement.querySelectorAll('dd').length;

    expect(titles).toBe(details);
    expect(titles).toBeGreaterThan(10);
  });

  it('points at the help and credits pages', () => {
    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a'))
      .map(a => a.getAttribute('href') || a.getAttribute('routerLink'));

    expect(links.join(' ')).toContain('/help');
    expect(links.join(' ')).toContain('/credits');
  });
});

describe('version declaration', () => {
  it('uses a plain three-part version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('carries the fork name', () => {
    expect(APP_NAME).toBe('Pocket Mido+');
  });
});
