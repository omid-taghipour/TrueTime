import { useCallback, useEffect, useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';
import { elapsedAt } from '../lib/elapsed';

const STORAGE_KEY = 'stopwatches';

function loadStopwatches(): Stopwatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Stopwatch[]) : [];
  } catch {
    return [];
  }
}

/**
 * Rebases a stopwatch onto a corrected elapsed time.
 *
 * A running stopwatch has its start timestamp re-stamped to `now`: the
 * partial interval it had accrued is already folded into `nextMs`, so
 * leaving the old timestamp in place would count it twice.
 *
 * `lastActiveAt` is deliberately left alone — it drives most-recently-used
 * ordering, and correcting a time is an edit, not a run. Writing it here
 * would re-sort the list out from under the cursor mid-edit.
 */
function withElapsed(stopwatch: Stopwatch, nextMs: number, now: number): Stopwatch {
  const clamped = Math.max(0, Math.floor(nextMs));
  const isRunning = stopwatch.status === 'running';
  return {
    ...stopwatch,
    status: isRunning ? 'running' : clamped > 0 ? 'paused' : 'stopped',
    accumulatedTime: clamped,
    lastStartedTimestamp: isRunning ? now : null,
  };
}

/**
 * Owns persisted stopwatch state and all time-math mutations.
 *
 * Running time is never tracked via a live interval here — only
 * `accumulatedTime` + `lastStartedTimestamp` are stored. Elapsed time is
 * always derived as `accumulatedTime + (now - lastStartedTimestamp)` by
 * consumers (see useLiveElapsed), so a closed/reopened or crashed app
 * resumes with the exact correct elapsed time with no drift.
 */
export function useStopwatches() {
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>(loadStopwatches);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stopwatches));
  }, [stopwatches]);

  const createStopwatch = useCallback((name: string) => {
    const stopwatch: Stopwatch = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Untitled stopwatch',
      status: 'stopped',
      accumulatedTime: 0,
      lastStartedTimestamp: null,
      lastActiveAt: Date.now(),
    };
    setStopwatches((prev) => [...prev, stopwatch]);
  }, []);

  const renameStopwatch = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStopwatches((prev) => prev.map((sw) => (sw.id === id ? { ...sw, name: trimmed } : sw)));
  }, []);

  // Starting a stopwatch instantly pauses whichever other stopwatch is
  // running, capturing its exact elapsed time to the millisecond.
  const startStopwatch = useCallback((id: string) => {
    const now = Date.now();
    setStopwatches((prev) =>
      prev.map((sw) => {
        if (sw.id === id) {
          if (sw.status === 'running') return sw;
          return { ...sw, status: 'running', lastStartedTimestamp: now, lastActiveAt: now };
        }
        if (sw.status === 'running' && sw.lastStartedTimestamp !== null) {
          return {
            ...sw,
            status: 'paused',
            accumulatedTime: sw.accumulatedTime + (now - sw.lastStartedTimestamp),
            lastStartedTimestamp: null,
            lastActiveAt: now,
          };
        }
        return sw;
      })
    );
  }, []);

  const pauseStopwatch = useCallback((id: string) => {
    const now = Date.now();
    setStopwatches((prev) =>
      prev.map((sw) => {
        if (sw.id !== id || sw.status !== 'running' || sw.lastStartedTimestamp === null) {
          return sw;
        }
        return {
          ...sw,
          status: 'paused',
          accumulatedTime: sw.accumulatedTime + (now - sw.lastStartedTimestamp),
          lastStartedTimestamp: null,
          lastActiveAt: now,
        };
      })
    );
  }, []);

  const resetStopwatch = useCallback((id: string) => {
    const now = Date.now();
    setStopwatches((prev) =>
      prev.map((sw) =>
        sw.id === id
          ? { ...sw, status: 'stopped', accumulatedTime: 0, lastStartedTimestamp: null, lastActiveAt: now }
          : sw
      )
    );
  }, []);

  // Correcting a forgotten start: set the elapsed time outright, or nudge
  // it by a delta. Both work on a running stopwatch without stopping it.
  const setElapsedTime = useCallback((id: string, ms: number) => {
    const now = Date.now();
    setStopwatches((prev) =>
      prev.map((sw) => (sw.id === id ? withElapsed(sw, ms, now) : sw))
    );
  }, []);

  const adjustElapsedTime = useCallback((id: string, deltaMs: number) => {
    const now = Date.now();
    setStopwatches((prev) =>
      prev.map((sw) => (sw.id === id ? withElapsed(sw, elapsedAt(sw, now) + deltaMs, now) : sw))
    );
  }, []);

  const deleteStopwatch = useCallback((id: string) => {
    setStopwatches((prev) => prev.filter((sw) => sw.id !== id));
  }, []);

  const clearAllStopwatches = useCallback(() => {
    setStopwatches([]);
  }, []);

  const replaceStopwatches = useCallback((list: Stopwatch[]) => {
    setStopwatches(list);
  }, []);

  return {
    stopwatches,
    createStopwatch,
    renameStopwatch,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    setElapsedTime,
    adjustElapsedTime,
    deleteStopwatch,
    clearAllStopwatches,
    replaceStopwatches,
  };
}
