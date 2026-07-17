import type { Stopwatch, StopwatchStatus } from '../types/stopwatch';

const EXPORT_VERSION = 1;

const STATUSES: StopwatchStatus[] = ['running', 'paused', 'stopped'];

/**
 * Serialize the stopwatch list to a JSON backup string.
 *
 * A running stopwatch stores `lastStartedTimestamp`; if it were exported as-is
 * and re-imported later, derived elapsed (`now - lastStartedTimestamp`) would
 * jump by the offline gap. So running stopwatches are folded to `paused` at
 * export time (same time-math fold as pauseStopwatch), producing a stable
 * snapshot.
 */
export function serializeStopwatches(list: Stopwatch[]): string {
  const now = Date.now();
  const stopwatches = list.map((sw) =>
    sw.status === 'running' && sw.lastStartedTimestamp !== null
      ? {
          ...sw,
          status: 'paused' as const,
          accumulatedTime: sw.accumulatedTime + (now - sw.lastStartedTimestamp),
          lastStartedTimestamp: null,
        }
      : sw
  );
  return JSON.stringify({
    version: EXPORT_VERSION,
    exportedAt: new Date(now).toISOString(),
    stopwatches,
  });
}

function isValidStopwatch(x: unknown): x is Stopwatch {
  if (typeof x !== 'object' || x === null) return false;
  const sw = x as Record<string, unknown>;
  return (
    typeof sw.id === 'string' &&
    typeof sw.name === 'string' &&
    STATUSES.includes(sw.status as StopwatchStatus) &&
    typeof sw.accumulatedTime === 'number' &&
    (sw.lastStartedTimestamp === null || typeof sw.lastStartedTimestamp === 'number') &&
    (sw.lastActiveAt === null || typeof sw.lastActiveAt === 'number')
  );
}

/**
 * Parse and validate a backup string produced by serializeStopwatches.
 * Throws an Error with a human-readable message on any malformed input —
 * this is a trust boundary (user-supplied file), so nothing is cast blindly.
 */
export function parseStopwatchImport(raw: string): Stopwatch[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Not a valid JSON file.');
  }

  // Accept either the versioned envelope or a bare array.
  const list = Array.isArray(data) ? data : (data as Record<string, unknown>)?.stopwatches;
  if (!Array.isArray(list)) {
    throw new Error('File does not contain a stopwatch list.');
  }
  if (!list.every(isValidStopwatch)) {
    throw new Error('File contains invalid stopwatch data.');
  }
  return list;
}
