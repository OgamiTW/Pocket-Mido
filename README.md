# Pocket Mido+

A fusion tool and compendium for the Megami Tensei games, covering more than forty
titles.

This is a personal fork of [**Megami Tensei Fusion Tools**][upstream] by
[**aqiu384**][aqiu384]. All of the compendium data and every line of the fusion
maths are theirs. What this fork adds is a different way of getting at it.

[upstream]: https://github.com/aqiu384/megaten-fusion-tool
[aqiu384]: https://github.com/aqiu384

---

## Credits first

The original tool has been built and maintained since 2017, across more than
five hundred commits, almost all of them by **aqiu384**. Every demon, skill,
resistance table and fusion chart in here came from that work, and so did the
algorithms that turn them into recipes. None of it was reimplemented.

These people have contributed to the original project, data corrections, fixes
and translations:

**aqiu384** · unitymind9 · titlekungCh · Maksym Fedorchuk · Mirari · GameArrah ·
Alexandre Gagnon · Eli Flores · George N · MinZe25

Taken from the commit history. If you contributed and are missing or listed
under the wrong name, that is an oversight, please open an issue
and it will be fixed.

If you are looking for the canonical, official tool, use
[aqiu384's][upstream-site]. This one is unofficial and maintained by one person.

[upstream-site]: https://aqiu384.github.io/megaten-fusion-tool/

---

## Why this exists

I play these games a lot, and kept running into the same small frictions, just moments where the tool made me do the work
myself:

- Hunting for a demon in a list of six hundred with a search box that only
  matched one word at a time.
- Wanting "fairies under level 40 that resist ice" and having to scroll.
- Reading a fusion recipe printed as one long run-on line.
- Losing track of which demons I already had, on paper, next to the keyboard.
- Not knowing whether a recipe was even reachable at my level without checking
  every ingredient.

So I started changing things for myself. Then other people suggested things I
had not thought of, and some of those turned out better than my own ideas. That
is most of what this fork is: an accumulation of small annoyances removed, from
my own play and from other people's suggestions.

The short version of what changed:

- **Search that works like search.** Several words in any order, quoted phrases,
  `-` to exclude, and filters like `race:fairy`, `lvl:20-40`, `weak:fire`,
  `inherit:fire`, `skill:agi`. With buttons, for when you would rather not type.
- **Recipes you can read.** Every participant with its level, one block per
  step, and the skills each ingredient carries shown as tags.
- **Keeping track of your run.** Star the demons you have, set your level, and
  the tool tells you what is within reach, what you can fuse right now, and what
  a saved plan is still missing.
- **More of the data, sooner.** Damage multipliers and ailment resistances in
  the list, instead of one demon page at a time.

There is a full list on the **What's new** page inside the tool, and the filter
syntax is documented on **How to use**.

---

## Contributing

Contributions are welcome. Pull requests, bug
reports, data corrections, or just telling me that something is awkward, all of
it is useful. Most of what is here started as someone describing a small
annoyance.

There are issue templates for [bugs](.github/ISSUE_TEMPLATE/bug_report.yml) and
for [quality-of-life ideas](.github/ISSUE_TEMPLATE/quality_of_life.yml). The
second one is the interesting one.

**One thing in particular:** the visual side leans heavily on the original's
plain, dense, information-first style, because that style is genuinely good for
a reference tool and because I am not much of a designer. I have kept to it and
tried not to make things worse. If you have an eye for this and want to improve
the look, please do. That
is the area where help would go furthest.

**Where to report what:** wrong or missing compendium data belongs
[upstream][upstream-issues], since it comes from there and fixing it there fixes
it for everyone. Anything about searching, filtering, the calculator layout or
the tracking features belongs here.

[upstream-issues]: https://github.com/aqiu384/megaten-fusion-tool/issues

---

## Running it

You need [Node.js](https://nodejs.org/) 22.22.3 or newer.

```sh
npm install
npm start          # dev server on http://localhost:4200
npm test           # unit tests
npm run build      # production build into dist/megaten-fusion-tool/browser
```

`npm run build` puts the site at `/` by default. To build it for a subdirectory,
which is what GitHub Pages needs, set `BASE_HREF`:

```sh
BASE_HREF=/your-repo-name/ npm run build
```

That one variable drives both the `<base href>` and the deep-link redirect in
`404.html`, so there is no repository name written down anywhere to get out of
sync.

### Running it offline

The app loads as ES modules and uses path-based routing, so opening
`index.html` from disk does not work — it needs to be served over HTTP. There is
a small zero-dependency server for that in [`local/`](local/README.md), which
also shuts itself down when you close the last tab.

---

## Deploying

Pushing to `main` builds and publishes to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The base href is
taken from the repository name automatically, so a fork of a fork needs no edits.

Enable it once, under **Settings → Pages → Build and deployment → Source →
GitHub Actions**. The site then lives at `https://<user>.github.io/<repo>/`.

---

## Licence

The original project is released into the public domain under the
[Unlicense](LICENSE.md), and this fork keeps that.

Shin Megami Tensei, Persona and all related names, characters and data belong to
**Atlus**. This is an unofficial fan tool with no affiliation.
