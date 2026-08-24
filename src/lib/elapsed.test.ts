import { describe, expect, it } from 'vitest';
import type { Stopwatch } from '../types/stopwatch';
import { elapsedAt } from './elapsed';

function makeStopwatch(overrides: Partial<Stopwatch> = {}): Stopwatch {
  return {
    id: 'sw-1',
    name: 'Reading',
    status: 'stopped',
    accumulatedTime: 0,
    lastStartedTimestamp: null,
    lastActiveAt: null,
    ...overrides,
  };
}

describe('elapsedAt', () => {
  it('adds the current running interval to the accumulated time', () => {
    const sw = makeStopwatch({
      status: 'running',
      accumulatedTime: 5_000,
      lastStartedTimestamp: 1_000,
    });

    expect(elapsedAt(sw, 3_500)).toBe(7_500);
  });

  it('returns the accumulated time for a paused stopwatch', () => {
    const sw = makeStopwatch({ status: 'paused', accumulatedTime: 5_000 });

    expect(elapsedAt(sw, 999_999)).toBe(5_000);
  });

  it('returns zero for a freshly created stopwatch', () => {
    expect(elapsedAt(makeStopwatch(), 999_999)).toBe(0);
  });

  it('ignores a running status with no start timestamp', () => {
    const sw = makeStopwatch({ status: 'running', accumulatedTime: 42, lastStartedTimestamp: null });

    expect(elapsedAt(sw, 999_999)).toBe(42);
  });
});
