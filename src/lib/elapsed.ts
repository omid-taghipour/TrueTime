import type { Stopwatch } from '../types/stopwatch';

/**
 * Elapsed milliseconds for a stopwatch at wall-clock time `now`.
 *
 * This is the read half of the app's time model: a running stopwatch's
 * elapsed time is always derived from its start timestamp rather than
 * tracked by a ticking counter. The pause/export folds also *write* the
 * result back into `accumulatedTime` and clear the timestamp, so they
 * stay separate from this.
 */
export function elapsedAt(stopwatch: Stopwatch, now: number): number {
  if (stopwatch.status === 'running' && stopwatch.lastStartedTimestamp !== null) {
    return stopwatch.accumulatedTime + (now - stopwatch.lastStartedTimestamp);
  }
  return stopwatch.accumulatedTime;
}
