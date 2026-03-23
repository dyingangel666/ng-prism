import { PerfRenderService } from './perf-render.service.js';

describe('PerfRenderService', () => {
  let service: PerfRenderService;

  beforeEach(() => {
    service = new PerfRenderService();
  });

  afterEach(() => {
    service.stopRecording();
  });

  it('should start in non-recording state', () => {
    expect(service.isRecording()).toBe(false);
  });

  it('should have null initialRender by default', () => {
    expect(service.initialRender()).toBeNull();
  });

  it('should have empty rerenders by default', () => {
    expect(service.rerenders()).toEqual([]);
  });

  it('should compute avgRerender as 0 when no samples', () => {
    expect(service.avgRerender()).toBe(0);
  });

  it('should toggle recording state', () => {
    service.startRecording();
    expect(service.isRecording()).toBe(true);
    service.stopRecording();
    expect(service.isRecording()).toBe(false);
  });

  it('should clear all state', () => {
    service.initialRender.set(5.0);
    service.rerenders.set([1, 2, 3]);
    service.cdRunCount.set(10);

    service.clear();

    expect(service.initialRender()).toBeNull();
    expect(service.rerenders()).toEqual([]);
    expect(service.cdRunCount()).toBe(0);
  });

  it('should compute p95 correctly', () => {
    const samples = Array.from({ length: 20 }, (_, i) => i + 1);
    service.rerenders.set(samples);
    expect(service.p95Rerender()).toBe(19);
  });

  it('should compute maxRerender correctly', () => {
    service.rerenders.set([1, 5, 3, 8, 2]);
    expect(service.maxRerender()).toBe(8);
  });

  it('should return last rerender', () => {
    service.rerenders.set([1, 2, 7]);
    expect(service.lastRerender()).toBe(7);
  });

  it('should return null for lastRerender when empty', () => {
    expect(service.lastRerender()).toBeNull();
  });
});
