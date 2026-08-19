import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStopwatches } from './useStopwatches';

describe('useStopwatches', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a stopwatch with sensible defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });

    expect(result.current.stopwatches).toHaveLength(1);
    expect(result.current.stopwatches[0]).toMatchObject({
      name: 'Reading',
      status: 'stopped',
      accumulatedTime: 0,
      lastStartedTimestamp: null,
      lastActiveAt: 1_000,
    });
    expect(result.current.stopwatches[0].id).toBeTruthy();
  });

  it('falls back to a default name when given blank input', () => {
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('   ');
    });

    expect(result.current.stopwatches[0].name).toBe('Untitled stopwatch');
  });

  it('ignores rename to a blank name but accepts a real one', () => {
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.renameStopwatch(id, '   ');
    });
    expect(result.current.stopwatches[0].name).toBe('Reading');

    act(() => {
      result.current.renameStopwatch(id, 'Deep Work');
    });
    expect(result.current.stopwatches[0].name).toBe('Deep Work');
  });

  it('starts a stopwatch by setting status running and stamping the start time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('A');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'running',
      lastStartedTimestamp: 1_000,
      lastActiveAt: 1_000,
    });
  });

  it('enforces mutual exclusion: starting one pauses the other and captures exact elapsed time', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const { result } = renderHook(() => useStopwatches());

    nowSpy.mockReturnValue(0);
    act(() => {
      result.current.createStopwatch('A');
      result.current.createStopwatch('B');
    });
    const [a, b] = result.current.stopwatches;

    act(() => {
      result.current.startStopwatch(a.id);
    });

    // 2.5 seconds later, start B while A is still running.
    nowSpy.mockReturnValue(2_500);
    act(() => {
      result.current.startStopwatch(b.id);
    });

    const pausedA = result.current.stopwatches.find((sw) => sw.id === a.id)!;
    const runningB = result.current.stopwatches.find((sw) => sw.id === b.id)!;

    expect(pausedA).toMatchObject({
      status: 'paused',
      accumulatedTime: 2_500,
      lastStartedTimestamp: null,
      lastActiveAt: 2_500,
    });
    expect(runningB).toMatchObject({
      status: 'running',
      lastStartedTimestamp: 2_500,
      lastActiveAt: 2_500,
    });
  });

  it('starting an already-running stopwatch is a no-op', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const { result } = renderHook(() => useStopwatches());

    nowSpy.mockReturnValue(1_000);
    act(() => {
      result.current.createStopwatch('A');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });

    nowSpy.mockReturnValue(9_000);
    act(() => {
      result.current.startStopwatch(id);
    });

    // lastStartedTimestamp should not have been bumped to 9_000.
    expect(result.current.stopwatches[0].lastStartedTimestamp).toBe(1_000);
  });

  it('pause folds the running interval into accumulatedTime', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const { result } = renderHook(() => useStopwatches());

    nowSpy.mockReturnValue(1_000);
    act(() => {
      result.current.createStopwatch('A');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });

    nowSpy.mockReturnValue(4_000);
    act(() => {
      result.current.pauseStopwatch(id);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'paused',
      accumulatedTime: 3_000,
      lastStartedTimestamp: null,
      lastActiveAt: 4_000,
    });

    // Pausing an already-paused stopwatch is a no-op.
    nowSpy.mockReturnValue(8_000);
    act(() => {
      result.current.pauseStopwatch(id);
    });
    expect(result.current.stopwatches[0].accumulatedTime).toBe(3_000);
  });

  it('resuming after a pause continues accumulating instead of restarting from zero', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const { result } = renderHook(() => useStopwatches());

    nowSpy.mockReturnValue(0);
    act(() => {
      result.current.createStopwatch('A');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });
    nowSpy.mockReturnValue(1_000);
    act(() => {
      result.current.pauseStopwatch(id);
    });

    nowSpy.mockReturnValue(5_000);
    act(() => {
      result.current.startStopwatch(id);
    });
    nowSpy.mockReturnValue(5_700);
    act(() => {
      result.current.pauseStopwatch(id);
    });

    expect(result.current.stopwatches[0].accumulatedTime).toBe(1_700);
  });

  it('reset zeroes accumulated time and stops the stopwatch, even mid-run', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const { result } = renderHook(() => useStopwatches());

    nowSpy.mockReturnValue(0);
    act(() => {
      result.current.createStopwatch('A');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });

    nowSpy.mockReturnValue(9_000);
    act(() => {
      result.current.resetStopwatch(id);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'stopped',
      accumulatedTime: 0,
      lastStartedTimestamp: null,
      lastActiveAt: 9_000,
    });
  });

  it('deletes a stopwatch without disturbing the others', () => {
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('A');
      result.current.createStopwatch('B');
    });
    const idToDelete = result.current.stopwatches[0].id;

    act(() => {
      result.current.deleteStopwatch(idToDelete);
    });

    expect(result.current.stopwatches).toHaveLength(1);
    expect(result.current.stopwatches[0].name).toBe('B');
  });

  it('persists state to localStorage and reloads it on next mount', () => {
    const { result, unmount } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Persisted');
    });
    unmount();

    const stored = JSON.parse(localStorage.getItem('stopwatches') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Persisted');

    const { result: secondMount } = renderHook(() => useStopwatches());
    expect(secondMount.current.stopwatches).toHaveLength(1);
    expect(secondMount.current.stopwatches[0].name).toBe('Persisted');
  });

  it('sets the elapsed time of a paused stopwatch outright', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.setElapsedTime(id, 5_400_000);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'paused',
      accumulatedTime: 5_400_000,
      lastStartedTimestamp: null,
      lastActiveAt: 1_000,
    });
  });

  it('keeps a running stopwatch running and does not double-count the current interval', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });

    // 10s in, correct the total to exactly one hour.
    nowSpy.mockReturnValue(11_000);
    act(() => {
      result.current.setElapsedTime(id, 3_600_000);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'running',
      accumulatedTime: 3_600_000,
      lastStartedTimestamp: 11_000,
    });

    // A further 5s of running adds 5s and nothing more.
    nowSpy.mockReturnValue(16_000);
    act(() => {
      result.current.pauseStopwatch(id);
    });

    expect(result.current.stopwatches[0].accumulatedTime).toBe(3_605_000);
  });

  it('adjusts by a delta relative to the live elapsed time while running', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.startStopwatch(id);
    });

    // 10s of real running, then +15m.
    nowSpy.mockReturnValue(11_000);
    act(() => {
      result.current.adjustElapsedTime(id, 900_000);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'running',
      accumulatedTime: 910_000,
      lastStartedTimestamp: 11_000,
    });
  });

  it('clamps a downward adjustment at zero and returns the stopwatch to stopped', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.setElapsedTime(id, 600_000);
    });
    act(() => {
      result.current.adjustElapsedTime(id, -900_000);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'stopped',
      accumulatedTime: 0,
      lastStartedTimestamp: null,
    });
  });

  it('promotes a never-started stopwatch to paused when time is added', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { result } = renderHook(() => useStopwatches());

    act(() => {
      result.current.createStopwatch('Reading');
    });
    const id = result.current.stopwatches[0].id;

    act(() => {
      result.current.adjustElapsedTime(id, 900_000);
    });

    expect(result.current.stopwatches[0]).toMatchObject({
      status: 'paused',
      accumulatedTime: 900_000,
      lastStartedTimestamp: null,
    });
  });
});
