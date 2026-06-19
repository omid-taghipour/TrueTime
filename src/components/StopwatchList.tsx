import type { Stopwatch } from '../types/stopwatch';
import { StopwatchCard } from './StopwatchCard';

interface StopwatchListProps {
  stopwatches: Stopwatch[];
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function StopwatchList({
  stopwatches,
  onStart,
  onPause,
  onReset,
  onDelete,
  onRename,
}: StopwatchListProps) {
  if (stopwatches.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-slate-500">
        No stopwatches yet. Create one above to get started.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {stopwatches.map((stopwatch) => (
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
  );
}
