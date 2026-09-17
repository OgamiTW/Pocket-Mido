import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// Hides something that would spoil a game until you ask for it. The text is
// blurred rather than removed, so you can see there is something there.
@Component({
  selector: 'app-spoiler',
  imports: [CommonModule],
  template: `
    <div [ngClass]="['spoiler', revealed() ? 'shown' : 'hidden']">
      @if (label()) {
        <span class="label">{{ label() }}</span>
      }

      <button type="button"
        class="veil"
        [attr.aria-expanded]="revealed()"
        [title]="revealed() ? 'Hide again' : 'Click to reveal'"
        (click)="toggle()">
        <span class="content" [attr.aria-hidden]="!revealed()">
          <ng-content></ng-content>
        </span>
        @if (!revealed()) {
          <span class="prompt">Spoiler &mdash; click to reveal</span>
        }
      </button>
    </div>
  `,
  styles: [`
    .spoiler {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.6em;
      padding: 0.5em;
    }
    .label { color: #aaaaaa; font-size: 0.9em; }
    .veil {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 12em;
      padding: 0.3em 0.8em;
      color: white;
      background-color: #1b1b1b;
      border: solid 1px #444444;
      border-radius: 4px;
      cursor: pointer;
      font: inherit;
      overflow: hidden;
    }
    .content {
      transition: filter 0.35s ease, opacity 0.35s ease;
    }
    .hidden .content {
      filter: blur(6px);
      opacity: 0.55;
      user-select: none;
    }
    .shown .content {
      filter: blur(0);
      opacity: 1;
    }
    .prompt {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #cccccc;
      font-size: 0.85em;
      letter-spacing: 0.02em;
      background-color: rgba(27, 27, 27, 0.55);
    }
    .hidden .veil:hover { border-color: #66BBFF; }
    .hidden .veil:hover .prompt { color: #66BBFF; }
    .shown .veil { border-color: #444444; cursor: pointer; }
  `]
})
export class SpoilerComponent {
  label = input('');
  revealed = signal(false);

  toggle() {
    this.revealed.update(shown => !shown);
  }
}
