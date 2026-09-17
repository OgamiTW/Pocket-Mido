import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

const STORAGE_PREFIX = 'megaten-fusion-tool.search';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  private router = inject(Router);
  private pending: { [param: string]: ReturnType<typeof setTimeout> } = {};

  read(route: ActivatedRoute, context: string, param: string): string {
    const fromUrl = route.snapshot.queryParamMap.get(param);

    if (fromUrl !== null) { return fromUrl; }

    return this.readStorage(this.storageKey(route, context));
  }

  write(route: ActivatedRoute, context: string, param: string, value: string, debounceMs = 250) {
    this.saveStorage(this.storageKey(route, context), value);

    clearTimeout(this.pending[param]);
    this.pending[param] = setTimeout(() => this.router.navigate([], {
      relativeTo: route,
      queryParams: { [param]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }), debounceMs);
  }

  private storageKey(route: ActivatedRoute, context: string): string {
    const game = route.snapshot.pathFromRoot
      .reduce((segments, parent) => segments.concat(parent.url.map(part => part.path)), [])[0];

    return `${STORAGE_PREFIX}.${game || 'app'}.${context}`;
  }

  private readStorage(key: string): string {
    try {
      return localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  }

  private saveStorage(key: string, value: string) {
    try {
      if (value) { localStorage.setItem(key, value); } else { localStorage.removeItem(key); }
    } catch {
      return;
    }
  }
}
