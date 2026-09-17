'use strict';

// Single entry point for building the site.
//
// GitHub Pages serves a project site from /<repo>/, so the base href and the
// redirect in 404.html both have to know that prefix. Rather than hard-coding a
// repository name, it comes from BASE_HREF, which the deploy workflow fills in
// from the repository itself. Building locally without it gives a site rooted
// at "/", which is what the local server wants.

const { copyFileSync, existsSync, readFileSync, writeFileSync } = require('fs');
const { spawnSync } = require('child_process');
const { join, resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'dist', 'megaten-fusion-tool', 'browser');
const CLI = join(ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const CLI_BOOTSTRAP = join(ROOT, 'node_modules', '@angular', 'cli', 'bin', 'bootstrap.js');

// The Angular CLI refuses to start on Node versions it does not support. That
// check is the launcher's, not the compiler's, so an unsupported-but-working
// Node can still build by calling what the launcher would have called.
const NODE_VERSION_EXIT = 3;

function baseHref() {
  const value = (process.env.BASE_HREF || '/').trim();

  // Git Bash on Windows rewrites a bare "/" argument into a Windows path, which
  // would otherwise be baked into the site silently.
  if (value.includes(':') || value.includes('\\')) {
    console.warn(`BASE_HREF looks like a local path ("${value}"); using "/" instead.`);
    console.warn('Pass it as BASE_HREF=/your-repo/ or let the deploy workflow set it.');
    return '/';
  }

  if (!value.startsWith('/')) { return `/${value}/`.replace(/\/+$/, '/'); }

  return value.endsWith('/') ? value : `${value}/`;
}

function run(args, label) {
  console.log(`\n> ${label}`);
  return spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' }).status;
}

function build(href) {
  const args = ['build', '--base-href', href];
  const status = run([CLI, ...args], `Building for ${href}`);

  if (status === NODE_VERSION_EXIT) {
    console.warn('\nThe Angular CLI rejected this Node version; calling its bootstrap directly.');
    console.warn('Upgrade Node to use the CLI normally.\n');
    return run([CLI_BOOTSTRAP, ...args], `Building for ${href}`);
  }

  return status;
}

function stampErrorPage(href) {
  const source = join(ROOT, 'src', '404.html');
  const target = join(OUT, '404.html');

  if (!existsSync(source)) { return; }

  // GitHub Pages has no server-side routing: it serves 404.html for any deep
  // link, which then hands the path back to the app as a query parameter.
  const siteRoot = href === '/' ? '' : href.replace(/\/$/, '');

  writeFileSync(target, readFileSync(source, 'utf8').split('$SITE_ROOT').join(siteRoot));
  console.log(`Wrote 404.html for site root "${siteRoot || '/'}"`);
}

function disableJekyll() {
  // Without this, Pages runs the output through Jekyll and drops any file or
  // directory whose name starts with an underscore.
  writeFileSync(join(OUT, '.nojekyll'), '');
  console.log('Wrote .nojekyll');
}

const href = baseHref();
const stampStatus = run([join(ROOT, 'src', 'update-version.js')], 'Stamping version');

if (stampStatus !== 0) { process.exit(stampStatus || 1); }

const buildStatus = build(href);

if (buildStatus !== 0) { process.exit(buildStatus || 1); }

stampErrorPage(href);
disableJekyll();

console.log(`\nBuilt into ${OUT}`);
