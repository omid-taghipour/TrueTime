import { useEffect, useRef, useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';
import { useSortStrategy, type SortStrategy } from '../hooks/useSortStrategy';
import { isDialogOpen } from '../lib/isDialogOpen';
import { isTypingTarget } from '../lib/isTypingTarget';
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
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // createdIndex is captured against the full, unfiltered list up front so
  // the "Date created" strategy stays correct even once search narrows it.
  const indexed = stopwatches.map((stopwatch, createdIndex) => ({ stopwatch, createdIndex }));

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const visible = trimmedQuery
    ? indexed.filter((entry) => entry.stopwatch.name.toLowerCase().includes(trimmedQuery))
    : indexed;

  // The running stopwatch (mutual exclusion guarantees at most one) always
  // floats to the top regardless of strategy, but only among what search
  // left visible — a running stopwatch that doesn't match search stays hidden.
  const ordered = [...visible]
    .sort((a, b) => {
      if ((a.stopwatch.status === 'running') !== (b.stopwatch.status === 'running')) {
        return a.stopwatch.status === 'running' ? -1 : 1;
      }
      return compareByStrategy(sortStrategy, a, b);
    })
    .map((entry) => entry.stopwatch);

  // Keyboard shortcuts read through this ref so the listener can be
  // registered once on mount instead of resubscribing on every render.
  const latestRef = useRef({ ordered, onStart, onPause });
  latestRef.current = { ordered, onStart, onPause };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || isDialogOpen()) return;

      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        const { ordered, onStart, onPause } = latestRef.current;
        const top = ordered[0];
        if (!top) return;
        if (top.status === 'running') onPause(top.id);
        else onStart(top.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (stopwatches.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-slate-500">
        No stopwatches yet. Create one above to get started.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {stopwatches.length > 1 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-100/60 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  searchInputRef.current?.blur();
                }
              }}
              placeholder="Search stopwatches... (/)"
              aria-label="Search stopwatches"
              className="w-full rounded-lg bg-white px-3 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-slate-200 transition-shadow focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <XIcon />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
            {isConfirmingClearAll ? (
              <>
                <span className="truncate text-xs text-slate-600 dark:text-slate-300">
                  Delete all {stopwatches.length} stopwatches?
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setIsConfirmingClearAll(false)}
                    className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onClearAll();
                      setIsConfirmingClearAll(false);
                    }}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
                  >
                    Delete all
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsConfirmingClearAll(true)}
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
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
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none transition-shadow focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="recent">Recently used</option>
                    <option value="created">Date created</option>
                    <option value="name">Name (A&ndash;Z)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          No stopwatches match &ldquo;{searchQuery}&rdquo;.
        </p>
      ) : (
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
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
