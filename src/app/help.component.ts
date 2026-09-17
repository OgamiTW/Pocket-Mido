import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { BackupComponent } from './shared/player/backup.component';

interface HelpRow {
  syntax: string;
  desc: string;
}

@Component({
  selector: 'app-help',
  imports: [CommonModule, RouterModule, BackupComponent],
  template: `
    <div class="help app-width">
      <h2>How to use this</h2>

      <section>
        <h3>Searching</h3>
        <p>
          Every list has a search box. Words are matched in any order, so
          <code>jack frost</code> and <code>frost jack</code> find the same demon. Quote a
          phrase to keep it together: <code>"dark hero"</code>. Put a <code>-</code> in front
          of anything to exclude it.
        </p>
        <p>
          Beyond plain words you can filter on specific fields. Press <code>/</code> anywhere
          to jump to the search box, and <code>Esc</code> to clear it.
        </p>
      </section>

      @for (group of groups; track group.title) {
        <section>
          <h3>{{ group.title }}</h3>
          <dl>
            @for (row of group.rows; track row.syntax) {
              <div><dt>{{ row.syntax }}</dt><dd>{{ row.desc }}</dd></div>
            }
          </dl>
        </section>
      }

      <section>
        <h3>Planning a fusion</h3>
        <p>
          On a demon's page, <strong>I want to fuse it</strong> opens the fusion calculator
          already aimed at that demon. In the chain it works out, every demon is a link: click
          one and the calculator starts building that instead, which is how you unpick a long
          recipe backwards.
        </p>
        <p>
          The flag beside a recipe &mdash; on the fusion tabs, or beside a step in the
          calculator &mdash; saves it to <strong>My plans</strong> in the demon list, which
          lists what you still need for each one. <strong>Can fuse now</strong> beside it works
          the other way round: it crosses the demons you have starred with what they fuse into.
        </p>
        <p class="note">
          A special fusion needing three or more ingredients cannot be saved as a plan: a plan
          is a pair of ingredients making one result, so those steps show no flag.
        </p>
      </section>

      <section>
        <h3>Tracking your game</h3>
        <p>
          The star next to a demon marks it as one you already have. Stars show up in the
          demon list, in fusion recipes and in the pickers, and clicking any of them marks
          the demon everywhere at once. <code>have:yes</code> then narrows a list to what
          you own.
        </p>
        <p>
          Setting <strong>My lvl</strong> in the filter bar dims the demons above your level
          in the list and the recipes you cannot make yet, and marks ingredients beyond it in
          red in the fusion calculator. One switch on the fusion tabs hides those recipes
          altogether. All of it is remembered per game, in this browser.
        </p>
      </section>

      <section>
        <h3>Extra columns</h3>
        <p>
          <strong>Multipliers</strong> swaps the <code>wk</code>/<code>rs</code>/<code>nu</code>
          codes for the actual damage multipliers, which is the only way to spot the unusual
          ones without opening a demon's page. <strong>Ailments</strong> adds the ailment
          resistance columns. Both buttons only appear on games whose data has that
          information.
        </p>
      </section>

      <section>
        <h3>Saved filters</h3>
        <p>
          Once a filter is typed you can save it under a name and pick it again later from the
          dropdown beside the search box. Filters also travel in the address bar, so a link you
          copy carries the filter with it.
        </p>
      </section>

      <section>
        <h3>Your data</h3>
        <p>
          Your stars, your level and your saved filters are kept in this browser only &mdash;
          they do not travel to another device and clearing site data wipes them. Export
          writes them all to a file; import puts them back and reloads the page.
        </p>
        <app-backup></app-backup>
      </section>

      <p class="footnote">
        Coming from the original tool? <a routerLink="/whats-new">What's new</a> lists the
        differences. Something missing or confusing? See the
        <a routerLink="/credits">credits page</a> &mdash; suggestions are welcome.
      </p>
    </div>
  `,
  styles: [`
    .help { padding: 0 1em 3em; line-height: 1.55; }
    h2 { text-align: center; }
    section {
      padding: 0.8em 1em;
      margin-bottom: 0.8em;
      background-color: #282828;
      border-radius: 3.5px;
    }
    h3 { margin: 0 0 0.5em; color: #66BBFF; font-size: 1.05em; }
    p { margin: 0 0 0.7em; }
    p:last-child { margin-bottom: 0; }
    code {
      padding: 0.05em 0.35em;
      background-color: #1b1b1b;
      border-radius: 3px;
      font-size: 0.9em;
    }
    dl { margin: 0; }
    dl div { display: flex; flex-wrap: wrap; gap: 0.6em; padding: 0.15em 0; }
    dt {
      flex: 0 0 13em;
      color: #66BBFF;
      font-family: monospace;
      white-space: nowrap;
    }
    dd { flex: 1 1 14em; margin: 0; color: #cccccc; }
    .footnote { text-align: center; color: #aaaaaa; }
    .note { color: #aaaaaa; font-size: 0.9em; }
  `]
})
export class HelpComponent implements OnInit {
  groups: { title: string, rows: HelpRow[] }[] = [
    {
      title: 'Filtering demons',
      rows: [
        { syntax: 'race:fairy', desc: 'By race. Use | for alternatives: race:fairy|jirae' },
        { syntax: 'lvl:20-40', desc: 'Level range. Also lvl:>30, lvl:<=50, lvl:42' },
        { syntax: 'weak:fire', desc: 'Weak to an element' },
        { syntax: 'nu: rs: rp: ab:', desc: 'Nulls, resists, repels or drains an element' },
        { syntax: 'strong:elec', desc: 'Anything better than normal; immune: for null/repel/drain' },
        { syntax: 'skill:agi', desc: 'Learns a skill whose name matches' },
        { syntax: 'st:>30', desc: 'By stat, using the column names of that game' },
        { syntax: 'have:yes', desc: 'Only demons you starred. have:no for the rest' },
        { syntax: 'inherit:fire', desc: 'Knows a skill of that element, to pass on in a fusion' }
      ]
    },
    {
      title: 'Filtering skills',
      rows: [
        { syntax: 'elem:fire', desc: 'By element; inherit:fire for the inherited element' },
        { syntax: 'cost:<=20', desc: 'By cost. Also rank:>50, lvl:>=40' },
        { syntax: 'by:pixie', desc: 'Learned by a demon whose name matches' },
        { syntax: 'target:all', desc: 'By target, damage, hits or requires' }
      ]
    },
    {
      title: 'Filtering fusion recipes',
      rows: [
        { syntax: 'lvl:<=40', desc: 'Both ingredients at or below 40 - recipes you can make now' },
        { syntax: 'race:fairy', desc: 'Either ingredient is that race' },
        { syntax: 'name1:jack', desc: 'Pin one side: name1, name2, race1, race2, lvl1, lvl2' },
        { syntax: 'inherit:fire', desc: 'An ingredient brings a fire skill you could inherit' },
        { syntax: 'have:yes', desc: 'Both ingredients are demons you own' },
        { syntax: 'price:<5000', desc: 'By summoning price' }
      ]
    }
  ];

  constructor(private title: Title) { }

  ngOnInit() {
    this.title.setTitle('How to use - Pocket Mido+');
  }
}
