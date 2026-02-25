import { Injectable, signal } from '@angular/core';

export interface EventLogEntry {
  timestamp: number;
  name: string;
  value: unknown;
}

@Injectable({ providedIn: 'root' })
export class PrismEventLogService {
  readonly events = signal<EventLogEntry[]>([]);

  log(name: string, value: unknown): void {
    this.events.update((prev) => [
      { timestamp: Date.now(), name, value },
      ...prev,
    ]);
  }

  clear(): void {
    this.events.set([]);
  }
}
