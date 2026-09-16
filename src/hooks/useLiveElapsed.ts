import { useEffect, useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';
import { elapsedAt } from '../lib/elapsed';

/**
 * Returns the live elapsed ms for a stopwatch, re-rendering on every
 * animation frame only while it's running. The value is always recomputed
 * from `Date.now()` rather than incremented, so there is no drift and a
 * component remounted after the app was closed picks up the correct time
 * immediately.
 */
export function useLiveElapsed(stopwatch: Stopwatch): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (stopwatch.status !== 'running') return;

    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [stopwatch.status]);

  return elapsedAt(stopwatch, now);
}
