import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'showMilliseconds';

// Module-level subscriber set so every hook instance reacts when any one of
// them calls setShowMs — no Context needed.
const subscribers = new Set<(val: boolean) => void>();

function load(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function useShowMilliseconds() {
  const [showMs, setShowMsState] = useState<boolean>(load);

  useEffect(() => {
    const notify = (val: boolean) => setShowMsState(val);
    subscribers.add(notify);
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  const setShowMs = useCallback((val: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(val));
    subscribers.forEach((fn) => fn(val));
  }, []);

  return { showMs, setShowMs };
}
