export type StopwatchStatus = 'running' | 'paused' | 'stopped';

export interface Stopwatch {
  id: string;
  name: string;
  status: StopwatchStatus;
  /** Milliseconds accumulated across all previous running periods. */
  accumulatedTime: number;
  /** Unix epoch ms when the stopwatch was last started; null when not running. */
  lastStartedTimestamp: number | null;
}
