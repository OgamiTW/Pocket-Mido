import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { gameKey } from '../game-key';

const STORAGE_PREFIX = 'megaten-fusion-tool.savedFilters';

export interface SavedFilter {
  name: string;
  query: string;
}

@Injectable({ providedIn: 'root' })
export class SavedFilterService {
  private router = inject(Router);
  private revision$ = signal(0);

  list(context: string): SavedFilter[] {
    this.revision$();
    return this.read(context);
  }

  save(context: string, name: string, query: string) {
    const trimmed = name.trim();

    if (!trimmed || !query) { return; }

    const filters = this.read(context).filter(filter => filter.name !== trimmed);
    filters.push({ name: trimmed, query });
    filters.sort((a, b) => a.name.localeCompare(b.name));
    this.write(context, filters);
  }

  remove(context: string, name: string) {
    this.write(context, this.read(context).filter(filter => filter.name !== name));
  }

  private key(context: string): string {
    return `${STORAGE_PREFIX}.${gameKey(this.router)}.${context}`;
  }

  private read(context: string): SavedFilter[] {
    try {
      const raw = localStorage.getItem(this.key(context));
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed.filter(f => f && typeof f.name === 'string' && typeof f.query === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private write(context: string, filters: SavedFilter[]) {
    try {
      localStorage.setItem(this.key(context), JSON.stringify(filters));
    } catch {
      return;
    }

    this.revision$.update(n => n + 1);
  }
}
