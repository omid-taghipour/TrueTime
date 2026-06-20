import { useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';
import { useSortStrategy, type SortStrategy } from '../hooks/useSortStrategy';
import { StopwatchCard } from './StopwatchCard';

interface StopwatchListProps {
  stopwatches: Stopwatch[];
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClearAll: () => void;
}

interface IndexedStopwatch {
  stopwatch: Stopwatch;
  createdIndex: number;
}

function compareByStrategy(strategy: SortStrategy, a: IndexedStopwatch, b: IndexedStopwatch) {
  switch (strategy) {
    case 'created':
      return a.createdIndex - b.createdIndex;
    case 'name':
      return a.stopwatch.name.localeCompare(b.stopwatch.name, undefined, { sensitivity: 'base' });
    case 'recent':
    default:
      return (b.stopwatch.lastActiveAt ?? 0) - (a.stopwatch.lastActiveAt ?? 0);
  }
}

export function StopwatchList({
  stopwatches,
  onStart,
  onPause,
  onReset,
  onDelete,
  onRename,
  onClearAll,
}: StopwatchListProps) {
  const { sortStrategy, setSortStrategy } = useSortStrategy();
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  if (stopwatches.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-slate-500">
        No stopwatches yet. Create one above to get started.
      </p>
    );
  }

  // The running stopwatch (mutual exclusion guarantees at most one) always
  // floats to the top regardless of strategy; the rest follow the chosen
  // strategy. createdIndex captures insertion order up front since sorting
  // below would otherwise erase it.
  const ordered = stopwatches
    .map((stopwatch, createdIndex) => ({ stopwatch, createdIndex }))
    .sort((a, b) => {
      if ((a.stopwatch.status === 'running') !== (b.stopwatch.status === 'running')) {
        return a.stopwatch.status === 'running' ? -1 : 1;
      }
      return compareByStrategy(sortStrategy, a, b);
    })
    .map((entry) => entry.stopwatch);

  return (
    <div className="mt-4">
      {stopwatches.length > 1 && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {isConfirmingClearAll ? (
            <>
              <span className="truncate text-xs text-slate-600 dark:text-slate-300">
                Delete all {stopwatches.length} stopwatches?
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setIsConfirmingClearAll(false)}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearAll();
                    setIsConfirmingClearAll(false);
                  }}
                  className="rounded-md bg-red-500/90 px-2.5 py-1 text-xs font-medium text-slate-950 transition-colors hover:bg-red-400"
                >
                  Delete all
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsConfirmingClearAll(true)}
                className="text-xs text-slate-500 transition-colors hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
              >
                Clear all
              </button>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-strategy" className="text-xs text-slate-500">
                  Sort by
                </label>
                <select
                  id="sort-strategy"
                  value={sortStrategy}
                  onChange={(e) => setSortStrategy(e.target.value as SortStrategy)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none transition-shadow focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="recent">Recently used</option>
                  <option value="created">Date created</option>
                  <option value="name">Name (A&ndash;Z)</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ordered.map((stopwatch) => (
          <StopwatchCard
            key={stopwatch.id}
            stopwatch={stopwatch}
            onStart={onStart}
            onPause={onPause}
            onReset={onReset}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>
    </div>
  );
}
