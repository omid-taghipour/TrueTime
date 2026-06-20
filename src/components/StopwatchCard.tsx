import { useEffect, useRef, useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';
import { formatTime } from '../lib/formatTime';
import { useLiveElapsed } from '../hooks/useLiveElapsed';

interface StopwatchCardProps {
  stopwatch: Stopwatch;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function StopwatchCard({
  stopwatch,
  onStart,
  onPause,
  onReset,
  onDelete,
  onRename,
}: StopwatchCardProps) {
  const elapsed = useLiveElapsed(stopwatch);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [draftName, setDraftName] = useState(stopwatch.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const commitRename = () => {
    onRename(stopwatch.id, draftName);
    setIsEditing(false);
  };

  const isRunning = stopwatch.status === 'running';

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isRunning ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-slate-800 bg-slate-900'
      }`}
    >
      {isConfirmingDelete ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-slate-300">Delete &ldquo;{stopwatch.name}&rdquo;?</span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(stopwatch.id)}
              className="rounded-md bg-red-500/90 px-2.5 py-1 text-xs font-medium text-slate-950 transition-colors hover:bg-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setDraftName(stopwatch.name);
                  setIsEditing(false);
                }
              }}
              className="flex-1 rounded-md bg-slate-800 px-2 py-1 text-sm font-medium text-slate-100 outline-none ring-1 ring-indigo-500"
            />
          ) : (
            <h3 className="flex-1 truncate text-sm font-medium text-slate-200">{stopwatch.name}</h3>
          )}
          <button
            onClick={() => {
              setDraftName(stopwatch.name);
              setIsEditing((prev) => !prev);
            }}
            aria-label="Rename stopwatch"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => setIsConfirmingDelete(true)}
            aria-label="Delete stopwatch"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <TrashIcon />
          </button>
        </div>
      )}

      <p
        className={`mt-3 font-mono text-3xl tabular-nums ${
          isRunning ? 'text-indigo-300' : 'text-slate-100'
        }`}
      >
        {formatTime(elapsed)}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => (isRunning ? onPause(stopwatch.id) : onStart(stopwatch.id))}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-amber-500/90 text-slate-950 hover:bg-amber-400'
              : 'bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
          }`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => onReset(stopwatch.id)}
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-9.193 9.193a2 2 0 0 1-.878.515l-2.83.808a.5.5 0 0 1-.617-.617l.808-2.83a2 2 0 0 1 .515-.878l9.193-9.193Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4a44.7 44.7 0 0 0-1.5.022V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.272a44.7 44.7 0 0 0-1.5-.022h-2Zm-2.857 4.7a.75.75 0 1 0-1.495-.1l.5 9a.75.75 0 1 0 1.495-.1l-.5-9Zm6.214 0a.75.75 0 0 0-1.495.1l-.5 9a.75.75 0 0 0 1.495.1l.5-9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
