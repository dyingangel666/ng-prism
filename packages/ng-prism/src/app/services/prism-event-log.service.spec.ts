import { PrismEventLogService } from './prism-event-log.service.js';

describe('PrismEventLogService', () => {
  let service: PrismEventLogService;

  beforeEach(() => {
    service = new PrismEventLogService();
  });

  it('should start with empty events', () => {
    expect(service.events()).toEqual([]);
  });

  it('should prepend new events', () => {
    service.log('click', { x: 1 });
    service.log('hover', null);

    const events = service.events();
    expect(events.length).toBe(2);
    expect(events[0].name).toBe('hover');
    expect(events[1].name).toBe('click');
  });

  it('should store value and name correctly', () => {
    service.log('submit', { form: 'test' });
    const entry = service.events()[0];
    expect(entry.name).toBe('submit');
    expect(entry.value).toEqual({ form: 'test' });
  });

  it('should include timestamp', () => {
    const before = Date.now();
    service.log('test', null);
    const after = Date.now();

    const ts = service.events()[0].timestamp;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('should clear all events', () => {
    service.log('a', 1);
    service.log('b', 2);
    service.clear();
    expect(service.events()).toEqual([]);
  });
});
