import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { APP_NAME, APP_VERSION, UPSTREAM_AUTHOR, UPSTREAM_NAME, UPSTREAM_URL } from './version';

interface Change {
  title: string;
  detail: string;
}

interface ChangeGroup {
  title: string;
  changes: Change[];
}

@Component({
  selector: 'app-whats-new',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="whats-new app-width">
      <h2>What's new in {{ appName }}</h2>
      <p class="lede">
        Everything below is what this fork adds on top of
        <a [href]="upstreamUrl">{{ upstreamName }}</a> by {{ upstreamAuthor }}. The compendium
        data and the fusion maths are theirs and are untouched &mdash; these are changes to how
        you search, filter and read it.
      </p>

      <p class="version">Version {{ appVersion }}</p>

      @for (group of groups; track group.title) {
        <section>
          <h3>{{ group.title }}</h3>
          <dl>
            @for (change of group.changes; track change.title) {
              <div>
                <dt>{{ change.title }}</dt>
                <dd>{{ change.detail }}</dd>
              </div>
            }
          </dl>
        </section>
      }

      <p class="footnote">
        New to the filters? The <a routerLink="/help">how to use</a> page lists everything you
        can type. Credits for the original are on the <a routerLink="/credits">credits</a> page.
      </p>
    </div>
  `,
  styles: [`
    .whats-new { padding: 0 1em 3em; line-height: 1.55; }
    h2 { text-align: center; margin-bottom: 0.4em; }
    .lede { text-align: center; color: #aaaaaa; margin: 0 auto 0.6em; max-width: 46em; }
    .version {
      text-align: center;
      color: #66BBFF;
      font-family: monospace;
      margin: 0 0 1.5em;
    }
    section {
      padding: 0.8em 1em;
      margin-bottom: 0.8em;
      background-color: #282828;
      border-radius: 3.5px;
    }
    h3 { margin: 0 0 0.5em; color: #66BBFF; font-size: 1.05em; }
    dl { margin: 0; }
    dl div { display: flex; flex-wrap: wrap; gap: 0.2em 0.8em; padding: 0.25em 0; }
    dt { flex: 0 0 15em; font-weight: bold; }
    dd { flex: 1 1 18em; margin: 0; color: #cccccc; }
    .footnote { text-align: center; color: #aaaaaa; }
  `]
})
export class WhatsNewComponent implements OnInit {
  appName = APP_NAME;
  appVersion = APP_VERSION;
  upstreamName = UPSTREAM_NAME;
  upstreamAuthor = UPSTREAM_AUTHOR;
  upstreamUrl = UPSTREAM_URL;

  groups: ChangeGroup[] = [
    {
      title: 'Searching and filtering',
      changes: [
        {
          title: 'A real search language',
          detail: 'The single substring box became a query language: several words in any ' +
            'order, quoted phrases, - to exclude, and filters like race:fairy, lvl:20-40, ' +
            'weak:fire, skill:agi or st:>30.'
        },
        {
          title: 'Buttons instead of syntax',
          detail: 'A filter bar with clickable element affinities, level range, race and ' +
            'ownership. It writes the same query the text box shows, so the two stay in step.'
        },
        {
          title: 'Filters that stay put',
          detail: 'What you filter survives navigation, travels in the address bar so links ' +
            'carry it, and can be saved under a name to reapply later.'
        },
        {
          title: 'Search everywhere',
          detail: 'The skill list, the fusion recipes, the triple fusion tables and the DLC ' +
            'settings all gained filtering. Several of them had none at all.'
        },
        {
          title: 'Who can pass me this skill?',
          detail: 'inherit:fire on the demon list finds everyone carrying a skill of that ' +
            'element, which used to be answerable only one demon page at a time.'
        },
        {
          title: 'Buttons for skills too',
          detail: 'The skill list gained element, cost, rank and target controls, with the ' +
            'options taken from the skills that game actually has.'
        },
        {
          title: 'Undo a sort',
          detail: 'Every table can be put back into its default order, not just the demon list.'
        },
        {
          title: 'Result counts and forgiving errors',
          detail: 'Every box shows how many of the total matched, and an unrecognised filter ' +
            'is reported rather than silently leaving you with an empty table.'
        }
      ]
    },
    {
      title: 'Fusion recipes',
      changes: [
        {
          title: 'Levels in the recipe',
          detail: 'Every participant shows its level, and ingredients above your own level ' +
            'are marked in red with a note saying what level the chain actually needs.'
        },
        {
          title: 'Recipes you can actually make',
          detail: 'Declare your level once and out-of-reach recipes dim, can be hidden ' +
            'entirely, or sorted so the cheapest you can make right now comes first.'
        },
        {
          title: 'A readable fusion chain',
          detail: 'The run-on line of text became a block per step: the ingredients on their ' +
            'own lines, the skills each one carries as tags, and what it makes set apart below.'
        },
        {
          title: 'Filters on the fusion tabs',
          detail: 'Ingredient level range, the element a recipe brings to inherit, and ' +
            'whether you own both ingredients - as buttons, on the demon page itself.'
        },
        {
          title: 'Only what you can make',
          detail: 'One switch hides the recipes needing an ingredient above your level, and ' +
            'another sorts so the cheapest you can make right now is first.'
        },
        {
          title: 'Three-ingredient fusions fixed',
          detail: 'Special fusions needing three or more demons used to collapse into one ' +
            'name showing level 0. They now split into a bracketed group, each with its level.'
        },
        {
          title: 'Spoiler-safe conditions',
          detail: 'A special fusion condition stays blurred until you click to reveal it.'
        }
      ]
    },
    {
      title: 'Fusion calculator',
      changes: [
        {
          title: 'Pickers instead of long dropdowns',
          detail: 'Choosing from hundreds of names blind is gone. Type to narrow, and see ' +
            'level, race and (for skills) cost and effect while you choose. Arrow keys work.'
        },
        {
          title: 'Know what you are fusing',
          detail: 'The target and both ingredients show a card with level, resistances and ' +
            'every skill they bring, with the effect on hover.'
        },
        {
          title: 'Straight from a demon page',
          detail: 'An "I want to fuse it" button opens the calculator already aimed at that ' +
            'demon, on the games that have a calculator at all.'
        },
        {
          title: 'Chaining',
          detail: 'Any demon in the resulting chain is a link: click it and the calculator ' +
            'starts building that one instead, so a long plan can be worked out backwards.'
        },
        {
          title: 'Inheritance slots',
          detail: 'Each chain shows how many of its inheritance slots are used, and the ' +
            'rows holding fixed innate skills are shown as locked rather than as dead controls.'
        }
      ]
    },
    {
      title: 'Demon lists and pages',
      changes: [
        {
          title: 'Damage multipliers',
          detail: 'A toggle swaps the wk/rs/nu codes for the real multipliers, so unusual ' +
            'ones are visible without opening each demon.'
        },
        {
          title: 'Ailment columns',
          detail: 'An optional set of ailment resistance columns, on the games that have them.'
        },
        {
          title: 'Compare up to four demons',
          detail: 'Stats and resistances side by side, with affinities ranked by how good ' +
            'they are rather than by their raw number, and columns you add as you need them.'
        },
        {
          title: 'What is out of reach',
          detail: 'Set your level and the demons above it dim in the list, the same way ' +
            'recipes you cannot make yet do.'
        },
        {
          title: 'Jump between demons',
          detail: 'A picker at the top of each page to go straight to another demon, with the ' +
            'ones you looked at recently underneath it, because reading a compendium means ' +
            'jumping about.'
        },
        {
          title: 'Learned By, readable',
          detail: 'One tag per demon instead of a run-on line, each showing the demon level ' +
            'and the level it learns the skill at, or innate.'
        },
        {
          title: 'Reset the sort',
          detail: 'A button to put a table back to its default order.'
        }
      ]
    },
    {
      title: 'Tracking your playthrough',
      changes: [
        {
          title: 'Mark what you have',
          detail: 'A star on each demon, in lists and in recipes alike, with have:yes to ' +
            'filter by it. Kept separately for each game.'
        },
        {
          title: 'Your level',
          detail: 'Set once and used across the tool to work out what is within reach.'
        },
        {
          title: 'Fusion plans',
          detail: 'Bookmark a recipe, from a fusion tab or from a step in the calculator, ' +
            'and it lands in a list that tells you which ingredients you are still missing.'
        },
        {
          title: 'What can I fuse now',
          detail: 'Crosses the demons you have starred with what they fuse into, so the ' +
            'question does not have to be worked out by hand.'
        },
        {
          title: 'Export and import',
          detail: 'All of it lives in your browser, so there is a way to carry it to another ' +
            'machine or keep it before clearing site data.'
        }
      ]
    },
    {
      title: 'Interface',
      changes: [
        {
          title: 'Wider and responsive',
          detail: 'No longer pinned to 1080 pixels, so the extra columns fit on a large screen.'
        },
        {
          title: 'Styled tooltips',
          detail: 'Its own tooltips instead of the browser default, appearing immediately.'
        },
        {
          title: 'Game list',
          detail: 'Forty-two identical rows became cards grouped by series.'
        },
        {
          title: 'Help and credits',
          detail: 'An in-app page documenting every filter, and a credits page for the ' +
            'original project and everyone who contributed to it.'
        },
        {
          title: 'Keyboard',
          detail: 'Press / to reach the search box and Esc to clear it; arrows and Enter ' +
            'drive the pickers.'
        }
      ]
    }
  ];

  constructor(private title: Title) { }

  ngOnInit() {
    this.title.setTitle(`What's new - ${APP_NAME}`);
  }
}
