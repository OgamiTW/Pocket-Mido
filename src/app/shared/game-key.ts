import { Router } from '@angular/router';

// The first path segment is the game, and everything we persist is scoped to it
// so a filter or a save file from one game never leaks into another.
export function gameKey(router: Router): string {
  return router.parseUrl(router.url).root.children.primary?.segments[0]?.path || 'app';
}
