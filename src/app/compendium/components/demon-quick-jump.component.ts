import { Component, computed, effect, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { PlayerStateService } from '../../shared/player/player-state.service';
import { Demon } from '../models';
import { DemonPickerComponent } from './demon-picker.component';
import { OwnedStarComponent } from './owned-star.component';

// Jump straight from one entry to another without going back to the list, with
// the demons you looked at recently sitting underneath.
@Component({
  selector: 'app-demon-quick-jump',
  imports: [RouterModule, DemonPickerComponent, OwnedStarComponent],
  template: `
    <div class="jump-panel">
      <div class="jump-row">
        <app-owned-star [name]="current()"></app-owned-star>
        <span class="picker-slot">
          <app-demon-picker
            [demons]="demons()"
            [selected]="current()"
            [placeholder]="placeholder()"
            (picked)="jumpTo($event)">
          </app-demon-picker>
        </span>
        @if (canFuse()) {
          <a class="fuse-btn"
            title="Open the fusion calculator with this one as the target"
            [routerLink]="['../../', 'recipes']"
            [queryParams]="{ target: current() }">I want to fuse it</a>
        }
      </div>

      @if (others().length) {
        <div class="recent-row">
          <span class="label">Recent</span>
          <span class="pills">
            @for (name of others(); track name) {
              <a class="pill" [routerLink]="['../', name]">{{ name }}</a>
            }
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    /* No overflow clipping here: the picker's dropdown is absolutely
       positioned inside and would be cut off. The bottom row rounds its own
       corners instead. */
    .jump-panel {
      margin-bottom: 0.5em;
      background-color: #1b1b1b;
      border: solid 1px #333333;
      border-radius: 4px;
    }
    .jump-row {
      display: flex;
      align-items: center;
      gap: 0.3em;
      padding: 0.4em 0.5em;
    }
    .picker-slot { flex: 1 1 auto; min-width: 0; }
    .fuse-btn {
      flex: 0 0 auto;
      padding: 0.25em 0.7em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      white-space: nowrap;
      text-decoration: none;
    }
    .fuse-btn:hover { color: yellow; border-color: #66BBFF; }
    .recent-row {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.3em 0.5em;
      padding: 0.4em 0.6em;
      border-top: solid 1px #333333;
      border-bottom-left-radius: 3px;
      border-bottom-right-radius: 3px;
      background-color: #161616;
    }
    .recent-row .label {
      flex: 0 0 auto;
      color: #aaaaaa;
      font-size: 0.85em;
    }
    .pills { display: flex; flex-wrap: wrap; gap: 0.3em; }
    .pill {
      padding: 0.1em 0.5em;
      background-color: #282828;
      border: solid 1px #333333;
      border-radius: 999px;
      font-size: 0.85em;
      text-decoration: none;
    }
    .pill:hover { border-color: #66BBFF; }
  `]
})
export class DemonQuickJumpComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private playerState = inject(PlayerStateService);

  demons = input<Demon[]>([]);
  current = input('');
  placeholder = input('Jump to another demon');
  canFuse = input(false);

  // The one you are already looking at is not somewhere to jump to.
  others = computed(() => this.playerState.recent$().filter(name => name !== this.current()));

  constructor() {
    effect(() => this.playerState.visit(this.current()));
  }

  jumpTo(name: string) {
    if (!name || name === this.current()) { return; }

    this.router.navigate(['../', name], { relativeTo: this.route });
  }
}
