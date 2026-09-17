import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

const PREFIX = 'megaten-fusion-tool.';
const FORMAT = 1;

export interface BackupFile {
  format: number;
  saved: { [key: string]: string };
}

export function collectBackup(store: Storage): BackupFile {
  const saved: { [key: string]: string } = {};

  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);

    if (key && key.startsWith(PREFIX)) { saved[key] = store.getItem(key); }
  }

  return { format: FORMAT, saved };
}

export function applyBackup(store: Storage, file: any): number {
  if (!file || typeof file !== 'object' || !file.saved || typeof file.saved !== 'object') {
    throw new Error('That file does not look like a backup from this tool.');
  }

  let count = 0;

  for (const key of Object.keys(file.saved)) {
    // Only ever write this tool's own keys, whatever the file claims.
    if (!key.startsWith(PREFIX) || typeof file.saved[key] !== 'string') { continue; }

    store.setItem(key, file.saved[key]);
    count++;
  }

  return count;
}

// Everything the tool remembers lives in this browser only. This is the way to
// carry it to another machine, or to keep it before clearing site data.
@Component({
  selector: 'app-backup',
  imports: [CommonModule],
  template: `
    <div class="backup">
      <button type="button" (click)="download()">Export my data</button>
      <label class="import">
        Import
        <input type="file" accept="application/json,.json" (change)="upload($event)">
      </label>
      @if (message()) {
        <span [ngClass]="['msg', failed() ? 'bad' : 'good']">{{ message() }}</span>
      }
    </div>
  `,
  styles: [`
    .backup { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6em; }
    button, .import {
      padding: 0.25em 0.6em;
      color: white;
      background-color: #333333;
      border: solid 1px #444444;
      border-radius: 3.5px;
      cursor: pointer;
      font: inherit;
    }
    button:hover, .import:hover { color: yellow; }
    .import input { display: none; }
    .msg { font-size: 0.9em; }
    .msg.good { color: #9edc9e; }
    .msg.bad { color: #ff7070; }
  `]
})
export class BackupComponent {
  message = signal('');
  failed = signal(false);

  download() {
    try {
      const file = collectBackup(localStorage);
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `megaten-fusion-tool-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      this.say(`${Object.keys(file.saved).length} entries exported.`, false);
    } catch (err) {
      this.say('Could not read your saved data in this browser.', true);
    }
  }

  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];

    if (!file) { return; }

    file.text()
      .then(text => {
        const count = applyBackup(localStorage, JSON.parse(text));
        this.say(`${count} entries imported. Reloading...`, false);
        setTimeout(() => location.reload(), 600);
      })
      .catch(err => this.say(err.message || 'That file could not be read.', true))
      .then(() => { input.value = ''; });
  }

  private say(message: string, failed: boolean) {
    this.message.set(message);
    this.failed.set(failed);
  }
}
