import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Stopwatch } from '../types/stopwatch';
import { parseStopwatchImport, serializeStopwatches } from './stopwatchIO';

const paused: Stopwatch = {
  id: 'a',
  name: 'Reading',
  status: 'paused',
  accumulatedTime: 5_000,
  lastStartedTimestamp: null,
  lastActiveAt: 1_000,
};

const running: Stopwatch = {
  id: 'b',
  name: 'Coding',
  status: 'running',
  accumulatedTime: 2_000,
  lastStartedTimestamp: 10_000,
  lastActiveAt: 10_000,
};

describe('stopwatchIO', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips a list unchanged when nothing is running', () => {
    vi.spyOn(Date, 'now').mockReturnValue(50_000);
    expect(parseStopwatchImport(serializeStopwatches([paused]))).toEqual([paused]);
  });

  it('normalizes a running stopwatch to paused, folding elapsed into accumulatedTime', () => {
    vi.spyOn(Date, 'now').mockReturnValue(15_000);
    const [result] = parseStopwatchImport(serializeStopwatches([running]));
    expect(result).toMatchObject({
      status: 'paused',
      accumulatedTime: 2_000 + (15_000 - 10_000),
      lastStartedTimestamp: null,
    });
  });

  it('accepts a bare top-level array', () => {
    expect(parseStopwatchImport(JSON.stringify([paused]))).toEqual([paused]);
  });

  it('throws on non-JSON input', () => {
    expect(() => parseStopwatchImport('not json')).toThrow();
  });

  it('throws when there is no stopwatch list', () => {
    expect(() => parseStopwatchImport(JSON.stringify({ version: 1 }))).toThrow();
  });

  it('throws on a malformed stopwatch entry', () => {
    const bad = JSON.stringify({ stopwatches: [{ id: 'x', name: 'y' }] });
    expect(() => parseStopwatchImport(bad)).toThrow();
  });
});
