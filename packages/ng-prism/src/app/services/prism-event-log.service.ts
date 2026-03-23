import { Injectable, signal } from '@angular/core';

export interface EventLogEntry {
  id: number;
  timestamp: number;
  name: string;
  value: unknown;
}

@Injectable({ providedIn: 'root' })
export class PrismEventLogService {
  readonly events = signal<EventLogEntry[]>([]);
  private _nextId = 0;

  log(name: string, value: unknown): void {
    this.events.update((prev) => [
      { id: this._nextId++, timestamp: Date.now(), name, value },
      ...prev,
    ]);
  }

  clear(): void {
    this.events.set([]);
  }
}
