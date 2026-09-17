import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlayerStateService } from '../../shared/player/player-state.service';

// The same "I have this one" star used in the demon list, so recipes and
// pickers can show ownership without each of them re-implementing it.
@Component({
  selector: 'app-owned-star',
  imports: [CommonModule],
  template: `
    @if (readonly()) {
      <span [ngClass]="['own-star', owned() ? 'owned' : 'not-owned']"
        [attr.aria-label]="owned() ? 'You have this one' : 'Not owned'">&#9733;</span>
    } @else {
      <button type="button"
        [ngClass]="['own-star', owned() ? 'owned' : 'not-owned']"
        [title]="owned() ? 'You have this one' : 'Mark as owned'"
        (click)="toggle($event)">&#9733;</button>
    }
  `,
  styles: [`
    :host { display: inline-flex; }
    .own-star {
      padding: 0 0.25em;
      background: none;
      border: 0;
      font-size: 1em;
      line-height: 1;
    }
    button.own-star { cursor: pointer; }
    .own-star.owned { color: gold; }
    .own-star.not-owned { color: #555555; }
    button.own-star:hover { color: yellow; }
  `]
})
export class OwnedStarComponent {
  private playerState = inject(PlayerStateService);

  name = input.required<string>();
  readonly = input(false);

  owned = computed(() => this.playerState.owned$().has(this.name()));

  toggle(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.playerState.toggleOwned(this.name());
  }
}
