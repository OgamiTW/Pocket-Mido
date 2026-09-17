'use strict';
const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');
const { createHash } = require('crypto');

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

// Browsers keep favicons in a cache of their own that ignores Cache-Control and
// survives a hard refresh, so the URL has to change when the icon does.
const faviconHash = createHash('md5')
  .update(readFileSync('src/favicon.ico'))
  .digest('hex')
  .slice(0, 8);

const indexString = readFileSync('src/index.html').toString();

writeFileSync('src/index.prod.html', indexString
  .replace('$COMMIT_HASH', commitHash)
  .replace('$FAVICON_HASH', faviconHash));
