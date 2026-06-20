import { useCallback, useEffect, useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';

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

  const deleteStopwatch = useCallback((id: string) => {
    setStopwatches((prev) => prev.filter((sw) => sw.id !== id));
  }, []);

  const clearAllStopwatches = useCallback(() => {
    setStopwatches([]);
  }, []);

  return {
    stopwatches,
    createStopwatch,
    renameStopwatch,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    deleteStopwatch,
    clearAllStopwatches,
  };
}
