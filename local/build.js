'use strict';

// Rebuilds the production bundle for local use.
// Calls the Angular CLI bootstrap directly so the build still runs on
// Node versions the CLI launcher rejects, and pins the base href to the
// site root because the local server serves from there (not a subpath).

const { spawnSync } = require('child_process');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');

// The same build the deploy uses, rooted at "/" because the local server
// serves from there rather than from a /<repo>/ prefix.
const result = spawnSync(process.execPath, [resolve(ROOT, 'scripts', 'build.js')], {
  cwd: ROOT,
  stdio: 'inherit',
  env: Object.assign({}, process.env, { BASE_HREF: '/' })
});

if (result.status !== 0) { process.exit(result.status || 1); }

console.log('\nDone. Launch it from the desktop shortcut.');
