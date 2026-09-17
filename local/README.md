# Local personal setup

The app is an Angular SPA: it loads its code as ES modules and uses path-based
routing, so opening `index.html` from disk (`file://`) shows a blank page.
It needs to be served over `http://`. These scripts do that invisibly.

## Daily use

Double-click **Fusion Calculator** on the desktop. It starts a local server
(no console window) and opens the browser. Launching it again while it is
already running just opens another tab.

## It shuts itself down

Every page served holds an `EventSource` open against `/__alive`, so the
server knows how many tabs are up. Close the last one and it exits 20 seconds
later. Nothing is left running.

- A refresh drops and remakes that connection within a second, well inside
  the 20s grace period, so F5 is safe.
- `EventSource` reconnects on its own, so a tab you left open will latch back
  onto the server the next time you launch it.
- If the browser never opens at all, the server gives up after 90 seconds
  instead of lingering.
- Suspending the machine can drop the connection and end the server. The tab
  stays usable (the app is client-side) but a refresh needs a relaunch.

## After changing the source

    node local/build.js

Then relaunch. There is no service worker in this app - `ngsw-worker.js` is
emitted into the build but never registered - so a plain reload always shows
the new bundle. No cache to clear.

## Files

- `serve.js` - zero-dependency static server on 127.0.0.1:4280, with the
  index.html fallback the router needs and the shutdown logic above.
- `build.js` - production build pinned to `--base-href /` for local serving.
- `Fusion Calculator.vbs` - launcher the desktop shortcut points at.

## Environment variables

- `FUSION_PORT` - port to serve on (default 4280)
- `FUSION_GRACE_MS` - delay before shutting down after the last tab (default 20000)
- `FUSION_STARTUP_MS` - give-up delay if no tab ever connects (default 90000)
- `FUSION_NO_BROWSER` - start the server without opening a browser
- `FUSION_DEBUG` - log requests and tab open/close events
