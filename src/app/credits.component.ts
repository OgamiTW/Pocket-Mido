import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { APP_NAME, APP_VERSION } from './version';

@Component({
  selector: 'app-credits',
  imports: [RouterModule],
  template: `
    <div class="credits">
      <h2>Credits &amp; thanks</h2>
      <p class="version">{{ appName }} v{{ appVersion }}</p>

      <section>
        <h3>The original tool</h3>
        <p>
          This is a personal fork of <strong>Megami Tensei Fusion Tools</strong>, created and
          maintained by <strong>aqiu384</strong>. That project is the whole foundation here:
          the fusion algorithms, the compendium data for more than forty games, and the years
          of upkeep that keep it accurate as new titles come out.
        </p>
        <p>
          Everything this fork adds sits on top of that work. None of it would exist otherwise.
        </p>
        <p class="links">
          <a href="https://github.com/aqiu384/megaten-fusion-tool">Original repository</a>
          <a href="https://aqiu384.github.io/megaten-fusion-tool/">Original site</a>
        </p>
      </section>

      <section>
        <h3>Everyone who contributed upstream</h3>
        <p>
          Alongside aqiu384, these people have contributed to the original project &mdash;
          data corrections, fixes and translations:
        </p>
        <ul class="people">
          @for (person of contributors; track person) {
            <li>{{ person }}</li>
          }
        </ul>
        <p class="note">
          Taken from the commit history. If you contributed and are missing or listed under the
          wrong name, that is an oversight on my part, not a slight &mdash; please tell me and
          I will fix it.
        </p>
      </section>

      <section>
        <h3>This fork</h3>
        <p>
          This version is maintained by <strong>{{ maintainer }}</strong>, alone and in their
          spare time. It exists to try out quality-of-life ideas &mdash; better filtering and
          search, a readable fusion breakdown, tracking which demons you already have &mdash;
          without asking the original project to take them on.
        </p>
        <p>
          It is <strong>not</strong> official and is not affiliated with the original author.
          Bugs you find here are almost certainly mine, so report them here rather than upstream.
        </p>
        <p>
          <a routerLink="/whats-new">See what this version changes</a> compared with the original.
        </p>
      </section>

      <section>
        <h3>Contributions are welcome</h3>
        <p>
          Anyone is welcome to help: pull requests, bug reports, data corrections, or just
          telling me something is awkward to use. Ideas about what is missing are as useful
          as code.
        </p>
      </section>

      <section>
        <h3>Licence</h3>
        <p>
          The original project is released into the public domain under the
          <a href="https://unlicense.org">Unlicense</a>, and this fork keeps that. Shin Megami
          Tensei, Persona and all related names and data belong to <strong>Atlus</strong>; this
          is an unofficial fan tool with no affiliation.
        </p>
      </section>
    </div>
  `,
  styles: [`
    .credits {
      max-width: var(--app-width);
      margin: 0 auto;
      padding: 0 1em 3em;
      line-height: 1.55;
    }
    h2 { text-align: center; margin-bottom: 0.3em; }
    .version {
      text-align: center;
      color: #66BBFF;
      font-family: monospace;
      margin: 0 0 1.2em;
    }
    section {
      padding: 0.8em 1em;
      margin-bottom: 0.8em;
      background-color: #282828;
      border-radius: 3.5px;
    }
    h3 { margin: 0 0 0.5em; color: #66BBFF; font-size: 1.05em; }
    p { margin: 0 0 0.7em; }
    p:last-child { margin-bottom: 0; }
    .links { display: flex; flex-wrap: wrap; gap: 1.2em; }
    .people {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4em 0.8em;
      margin: 0 0 0.7em;
      padding: 0;
      list-style: none;
    }
    .people li {
      padding: 0.1em 0.6em;
      background-color: #1b1b1b;
      border-radius: 999px;
      font-size: 0.9em;
    }
    .note { color: #aaaaaa; font-size: 0.9em; }
  `]
})
export class CreditsComponent implements OnInit {
  maintainer = 'OgamiTW';
  appName = APP_NAME;
  appVersion = APP_VERSION;

  // From the upstream commit history, most commits first.
  contributors = [
    'aqiu384', 'unitymind9', 'titlekungCh', 'Maksym Fedorchuk', 'Mirari',
    'GameArrah', 'Alexandre Gagnon', 'Eli Flores', 'George N', 'MinZe25'
  ];

  constructor(private title: Title) { }

  ngOnInit() {
    this.title.setTitle(`Credits - ${APP_NAME}`);
  }
}
