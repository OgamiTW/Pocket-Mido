import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Skill } from '../models';
import { PickerBase } from '../../shared/search/picker-base';
import { parseQuery } from '../../shared/search/query-parser';
import { compileSkillFilter } from '../models/skill-filter';
import { SkillCostToStringPipe } from '../pipes';

export function filterSkills(skills: Skill[], filter: string): Skill[] {
  const query = parseQuery(filter);

  if (query.isEmpty) { return skills; }

  const compiled = compileSkillFilter(query);

  return compiled.unknownTerms.length < query.terms.length
    ? skills.filter(compiled.predicate)
    : skills;
}

// Same idea as the demon picker: type to narrow, and see what each skill
// actually does while choosing instead of picking a bare name off a list.
@Component({
  selector: 'app-skill-picker',
  imports: [CommonModule, SkillCostToStringPipe],
  template: `
    <div class="picker" (focusout)="onFocusOut($event)">
      <input #field
        type="text"
        class="picker-field"
        spellcheck="false"
        autocomplete="off"
        [value]="open() ? filter() : selected()"
        [placeholder]="placeholder()"
        (focus)="onFocus()"
        (input)="onInput($any($event.target).value)"
        (keydown)="onKeydown($event)">
      @if (open()) {
        <div class="picker-panel">
          <ul class="picker-list" role="listbox">
            @if (!matches().length) {
              <li class="picker-empty">No match</li>
            }
            @for (skill of matches(); track skill.name; let i = $index) {
              <li role="option"
                [class.active]="i === highlight()"
                (mousedown)="pick(skill.name, $event)"
                (mousemove)="highlight.set(i)">
                <div class="element-icon {{ skill.element }}"></div>
                <span class="name">{{ skill.name }}</span>
                <span class="cost">{{ skill.cost ? (skill.cost | skillCostToString) : '' }}</span>
                <span class="effect">{{ skill.effect }}</span>
              </li>
            }
          </ul>
          @if (highlighted(); as skill) {
            <div class="picker-tip">
              <span class="tip-name">{{ skill.name }}</span>
              <span class="tip-effect">{{ skill.effect || 'No description' }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .picker { position: relative; }
    .picker-field {
      width: 100%;
      box-sizing: border-box;
      min-height: 25px;
      padding: 0.2em 0.4em;
      color: white;
      background-color: #111111;
      border: solid 1px #444444;
      border-radius: 3.5px;
      font: inherit;
    }
    .picker-field:focus { outline: none; border-color: #66BBFF; }
    .picker-panel {
      position: absolute;
      z-index: 20;
      left: 0;
      min-width: 100%;
      max-width: 34em;
      background-color: #1b1b1b;
      border: solid 1px #444444;
      border-radius: 3.5px;
      text-align: left;
      overflow: hidden;
    }
    .picker-list {
      margin: 0;
      padding: 0;
      max-height: 16em;
      overflow-y: auto;
      list-style: none;
    }
    /* The full effect lives at the foot of the panel: a tooltip inside the
       scrolling list would be clipped by its own overflow. */
    .picker-tip {
      display: flex;
      gap: 0.5em;
      padding: 0.45em 0.65em;
      background-color: rgba(0, 0, 0, 0.88);
      border-top: solid 1px #555555;
      color: white;
      font-size: 0.85em;
      line-height: 1.35;
      white-space: normal;
    }
    .picker-tip .tip-name { flex: 0 0 auto; font-weight: bold; }
    .picker-tip .tip-effect { flex: 1 1 auto; color: #dddddd; }
    .picker-list li {
      display: flex;
      align-items: center;
      gap: 0.5em;
      padding: 0.2em 0.4em;
      cursor: pointer;
      white-space: nowrap;
    }
    .picker-list li.active { background-color: #333333; }
    .picker-list li.picker-empty { color: #888888; cursor: default; }
    .picker-list .element-icon { flex: 0 0 20px; width: 20px; height: 20px; }
    .picker-list .name { flex: 0 0 9em; overflow: hidden; text-overflow: ellipsis; }
    .picker-list .cost {
      flex: 0 0 4em;
      color: #aaaaaa;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .picker-list .effect {
      flex: 1 1 auto;
      color: #aaaaaa;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class SkillPickerComponent extends PickerBase {
  skills = input<Skill[]>([]);
  selected = input('');
  placeholder = input('');
  picked = output<string>();

  matches = computed(() => filterSkills(this.skills(), this.filter()));
  highlighted = computed(() => this.matches()[this.highlight()] || null);

  protected matchCount(): number {
    return this.matches().length;
  }

  protected pickAt(index: number) {
    const match = this.matches()[index];

    if (match) { this.pick(match.name); }
  }

  pick(name: string, event?: Event) {
    if (event) { event.preventDefault(); }

    this.picked.emit(name);
    this.close();
  }
}
