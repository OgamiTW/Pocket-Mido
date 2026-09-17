'use strict';

// Zero-dependency static server for personal offline use.
// Serves the production build and falls back to index.html so the
// Angular router keeps working on a hard refresh or a bookmarked URL.
//
// Shuts itself down once the last browser tab is gone: every served page
// holds an EventSource open against /__alive, so closing the tab drops the
// connection and, after a short grace period, ends the process.

const { createServer } = require('http');
const { createReadStream, existsSync, readFileSync, statSync } = require('fs');
const { spawn } = require('child_process');
const { extname, join, normalize, resolve, sep } = require('path');

const PORT = Number(process.env.FUSION_PORT) || 4280;
const HOST = '127.0.0.1';
const ROOT = resolve(__dirname, '..', 'dist', 'megaten-fusion-tool', 'browser');
const URL = `http://${HOST}:${PORT}/`;

// Long enough to survive a page refresh, short enough to not linger.
const GRACE_MS = Number(process.env.FUSION_GRACE_MS) || 20000;
// If the browser never shows up at all, do not leak the process.
const STARTUP_MS = Number(process.env.FUSION_STARTUP_MS) || 90000;
const PING_MS = 30000;

const KEEPALIVE_TAG =
  '<script>(function(){try{new EventSource("/__alive");}catch(e){}})();</script>';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

let openTabs = 0;
let shutdownTimer = null;

function openBrowser() {
  if (process.env.FUSION_NO_BROWSER) { return; }
  spawn('cmd', ['/c', 'start', '', URL], { detached: true, stdio: 'ignore' }).unref();
}

function cancelShutdown() {
  if (shutdownTimer) { clearTimeout(shutdownTimer); shutdownTimer = null; }
}

function scheduleShutdown(delay) {
  cancelShutdown();
  shutdownTimer = setTimeout(() => {
    if (openTabs === 0) { process.exit(0); }
  }, delay);
}

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const candidate = resolve(ROOT, '.' + normalize(decoded).replace(/^[\/]+/, ''));

  // Never serve anything outside the build directory.
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) { return null; }

  if (existsSync(candidate) && statSync(candidate).isFile()) { return candidate; }

  // Extensionless paths are router URLs, not missing assets.
  if (!extname(candidate)) { return join(ROOT, 'index.html'); }

  return null;
}

function serveKeepalive(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write(': connected\n\n');

  openTabs++;
  cancelShutdown();
  if (process.env.FUSION_DEBUG) { console.log(new Date().toISOString().slice(11,19), 'TAB OPEN  -> tabs=' + openTabs); }

  const ping = setInterval(() => res.write(': ping\n\n'), PING_MS);
  let closed = false;

  req.on('close', () => {
    if (closed) { return; }
    closed = true;
    clearInterval(ping);
    openTabs--;
    if (process.env.FUSION_DEBUG) { console.log(new Date().toISOString().slice(11,19), 'TAB CLOSE -> tabs=' + openTabs); }

    if (openTabs === 0) { scheduleShutdown(GRACE_MS); }
  });
}

function serveIndex(res, file) {
  const raw = readFileSync(file, 'utf8');
  const html = raw.includes('</body>')
    ? raw.replace('</body>', KEEPALIVE_TAG + '</body>')
    : raw + KEEPALIVE_TAG;

  res.writeHead(200, {
    'Content-Type': MIME_TYPES['.html'],
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-cache'
  });
  res.end(html);
}

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`No build found at ${ROOT}`);
  console.error('Run: node local/build.js');
  process.exit(1);
}

const server = createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0].split('#')[0];
  if (process.env.FUSION_DEBUG) { console.log(new Date().toISOString().slice(11,19), req.method, urlPath); }

  if (urlPath === '/__alive') { serveKeepalive(req, res); return; }

  const file = resolveFile(urlPath);

  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  if (file.endsWith('index.html')) { serveIndex(res, file); return; }

  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });

  createReadStream(file).pipe(res);
});

server.on('error', err => {
  // Already running from an earlier launch: just show it.
  if (err.code === 'EADDRINUSE') { openBrowser(); process.exit(0); }
  console.error(err.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} at ${URL}`);
  scheduleShutdown(STARTUP_MS);
  openBrowser();
});
