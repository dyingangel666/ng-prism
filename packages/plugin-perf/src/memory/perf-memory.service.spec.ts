import { PerfMemoryService } from './perf-memory.service.js';

describe('PerfMemoryService', () => {
  let service: PerfMemoryService;

  beforeEach(() => {
    service = new PerfMemoryService();
  });

  it('should start with empty snapshots', () => {
    expect(service.snapshots()).toEqual([]);
  });

  it('should detect memory API availability', () => {
    expect(typeof service.available()).toBe('boolean');
  });

  it('should clear all snapshots', () => {
    service.snapshots.set([
      { label: 'test', bytes: 1000, timestamp: Date.now() },
    ]);
    service.clear();
    expect(service.snapshots()).toEqual([]);
  });

  it('should compute beforeCreate/afterCreate/afterDestroy as null initially', () => {
    expect(service.beforeCreate()).toBeNull();
    expect(service.afterCreate()).toBeNull();
    expect(service.afterDestroy()).toBeNull();
  });

  it('should compute delta when both snapshots exist', () => {
    service.snapshots.set([
      { label: 'before-create', bytes: 44 * 1024 * 1024, timestamp: 1 },
      { label: 'after-create', bytes: 46 * 1024 * 1024, timestamp: 2 },
    ]);
    expect(service.delta()).toBe(2 * 1024 * 1024);
  });

  it('should compute residual as null when no destroy snapshot', () => {
    service.snapshots.set([
      { label: 'before-create', bytes: 44 * 1024 * 1024, timestamp: 1 },
    ]);
    expect(service.residual()).toBeNull();
  });

  it('should compute leak status ok when residual is small', () => {
    service.snapshots.set([
      { label: 'before-create', bytes: 44 * 1024 * 1024, timestamp: 1 },
      { label: 'after-destroy', bytes: 44.1 * 1024 * 1024, timestamp: 3 },
    ]);
    expect(service.leakStatus()).toBe('ok');
  });

  it('should compute leak status warn when residual exceeds threshold', () => {
    service.snapshots.set([
      { label: 'before-create', bytes: 44 * 1024 * 1024, timestamp: 1 },
      { label: 'after-destroy', bytes: 45 * 1024 * 1024, timestamp: 3 },
    ]);
    expect(service.leakStatus()).toBe('warn');
  });

  it('should return unknown leak status when no data', () => {
    expect(service.leakStatus()).toBe('unknown');
  });
});
