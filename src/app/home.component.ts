import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';

import Translations from './compendium/data/translations.json';
import FusionTools from './compendium/data/fusion-tools.json';

interface GameEntry {
  game: string;
  title: string;
  label: string;
}

interface GameGroup {
  title: string;
  games: GameEntry[];
}

// The order the games already come in follows the series, so grouping is just
// a matter of saying where each run ends.
const SERIES: { title: string, games: string[] }[] = [
  {
    title: 'Shin Megami Tensei',
    games: ['kmt1', 'smt1', 'smt2', 'smtif', 'smt9', 'smtim', 'smt3',
            'smtsj', 'smtdsj', 'smt4', 'smt4f', 'smt5', 'smt5v']
  },
  {
    title: 'Devil Summoner',
    games: ['dsum', 'dssh', 'krch', 'rrch', 'krao', 'sh2']
  },
  {
    title: 'Persona',
    games: ['p1', 'p2t', 'p2b', 'p3', 'p3f', 'p3a', 'p3p', 'p3r', 'p3e',
            'p4', 'p4g', 'p5', 'p5r', 'p5s', 'p5t', 'pq', 'pq2']
  },
  {
    title: 'Majin Tensei & Devil Survivor',
    games: ['mjn1', 'mjn2', 'ds1', 'dso', 'ds2', 'ds2br']
  }
];

@Component({
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home app-width">
      <p class="lede">Pick a game to open its compendium and fusion calculator.</p>

      @for (group of groups; track group.title) {
        <section>
          <h2>{{ group.title }}</h2>
          <div class="grid">
            @for (tool of group.games; track tool.game) {
              <a class="card" [routerLink]="'../' + tool.game + (tool.game[0] === 'p' ? '/personas' : '/demons')">
                <span class="tag">{{ tool.label }}</span>
                <span class="title">{{ tool.title }}</span>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .home { padding: 0 1em 2em; }
    .lede { text-align: center; color: #aaaaaa; margin: 0.5em 0 1.5em; }
    section { margin-bottom: 1.5em; }
    h2 {
      margin: 0 0 0.6em;
      padding-bottom: 0.3em;
      border-bottom: solid 1px #444444;
      font-size: 1.1em;
      text-align: left;
      color: #66BBFF;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(17em, 1fr));
      gap: 0.5em;
    }
    .card {
      display: flex;
      align-items: center;
      gap: 0.6em;
      padding: 0.55em 0.7em;
      background-color: #282828;
      border: solid 1px #333333;
      border-radius: 4px;
      color: white;
      text-decoration: none;
    }
    .card:hover {
      background-color: #333333;
      border-color: #66BBFF;
      color: white;
    }
    .tag {
      flex: 0 0 auto;
      min-width: 3.8em;
      padding: 0.15em 0.45em;
      background-color: #1b1b1b;
      border-radius: 3px;
      color: #aaaaaa;
      font-family: monospace;
      font-size: 0.8em;
      text-align: center;
      text-transform: uppercase;
    }
    .title { flex: 1 1 auto; }
  `]
})
export class HomeComponent implements OnInit {
  fusionTools = FusionTools;
  langs = Translations.Languages.Languages;
  msgs = Translations.AppComponent;
  groups: GameGroup[] = [];
  langInd = 0;
  lang = 'en';

  constructor(private title: Title, private route: ActivatedRoute) { }

  ngOnInit() {
    const lang = this.route.snapshot.data.lang;
    this.lang = this.langs.includes(lang) ? lang : 'en';
    this.langInd = this.langs.indexOf(this.lang);
    this.title.setTitle(this.msgs.AppTitle[this.langInd]);

    const listed = Object.entries(this.fusionTools)
      .map(([game, titles]) => ({ game, label: game, title: titles[this.langInd] }))
      .filter(entry => entry.title && entry.title !== '-');

    const byGame = listed.reduce<{ [game: string]: GameEntry }>((acc, entry) => {
      acc[entry.game] = entry;
      return acc;
    }, {});

    const grouped = SERIES.map(series => ({
      title: series.title,
      games: series.games.map(game => byGame[game]).filter(entry => entry)
    })).filter(group => group.games.length);

    // Anything the series list does not mention still gets shown.
    const placed = new Set(SERIES.reduce<string[]>((all, s) => all.concat(s.games), []));
    const rest = listed.filter(entry => !placed.has(entry.game));

    this.groups = rest.length ? grouped.concat({ title: 'Other', games: rest }) : grouped;
  }
}
