import { useEffect, useRef, useState } from 'react';
import type { Stopwatch } from '../types/stopwatch';
import { formatTime } from '../lib/formatTime';
import { parseTime } from '../lib/parseTime';
import { maskTime } from '../lib/maskTime';
import { useLiveElapsed } from '../hooks/useLiveElapsed';
import { useShowMilliseconds } from '../hooks/useShowMilliseconds';

const MINUTE = 60_000;
const QUARTER_HOUR = 15 * MINUTE;

interface StopwatchCardProps {
  stopwatch: Stopwatch;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onReset: (id: string) => void;
  onSetElapsed: (id: string, ms: number) => void;
  onAdjustElapsed: (id: string, deltaMs: number) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function StopwatchCard({
  stopwatch,
  onStart,
  onPause,
  onReset,
  onSetElapsed,
  onAdjustElapsed,
  onDelete,
  onRename,
}: StopwatchCardProps) {
  const elapsed = useLiveElapsed(stopwatch);
  const { showMs } = useShowMilliseconds();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [draftName, setDraftName] = useState(stopwatch.name);
  const [draftTime, setDraftTime] = useState('');
  // Seeding draftTime on open would otherwise make Save commit a snapshot the
  // user never edited, silently discarding whatever a running stopwatch
  // accrued while the editor sat open. Only a real keystroke arms the commit.
  const [timeTouched, setTimeTouched] = useState(false);
  const [pendingDelta, setPendingDelta] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  // Digits fill in from the right, so the caret belongs at the end after every
  // keystroke — otherwise the mask reflows the text out from under it.
  useEffect(() => {
    const el = timeInputRef.current;
    if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length);
  }, [draftTime]);

  const openEditor = () => {
    setDraftName(stopwatch.name);
    setDraftTime(formatTime(elapsed, showMs));
    setTimeTouched(false);
    setPendingDelta(0);
    setIsConfirmingCancel(false);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsConfirmingCancel(false);
    setIsEditing(false);
  };

  // An unparseable entry yields null and falls through to the delta branch on
  // save, reverting the same way a blank rename is ignored — but the pending
  // line says so first, rather than letting Save appear to do nothing.
  const parsedDraft = timeTouched ? parseTime(draftTime) : null;

  const save = () => {
    if (parsedDraft !== null) onSetElapsed(stopwatch.id, parsedDraft + pendingDelta);
    else if (pendingDelta !== 0) onAdjustElapsed(stopwatch.id, pendingDelta);

    const trimmedName = draftName.trim();
    if (trimmedName && trimmedName !== stopwatch.name) onRename(stopwatch.id, trimmedName);

    closeEditor();
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent) => {
    // The discard prompt owns the keyboard while it is up. Escape backs out of
    // it, and Enter must not commit the very change it is asking about.
    if (isConfirmingCancel) {
      if (event.key === 'Escape') setIsConfirmingCancel(false);
      return;
    }
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') requestCancel();
  };

  const isRunning = stopwatch.status === 'running';
  // Nudges only move pendingDelta, so Cancel really does leave the stopwatch
  // untouched — and +15m followed by −15m is exact integer arithmetic on one
  // accumulator rather than two reads of a moving elapsed time. A typed value
  // replaces the baseline, so the nudges bound themselves against that rather
  // than against a live elapsed the entry has already overridden.
  const previewElapsed = Math.max(0, (parsedDraft ?? elapsed) + pendingDelta);
  const canSubtract = previewElapsed > 0;
  const signedDelta = `${pendingDelta > 0 ? '+' : '−'}${formatTime(Math.abs(pendingDelta))}`;
  // An out-of-range entry counts as dirty even though Save would ignore it —
  // it is still typing the user would lose without being asked.
  const isDirty =
    draftName.trim() !== stopwatch.name ||
    pendingDelta !== 0 ||
    (timeTouched && parsedDraft !== elapsed);

  const requestCancel = () => {
    if (isDirty) setIsConfirmingCancel(true);
    else closeEditor();
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all ${
        isRunning
          ? 'border-teal-500/50 bg-teal-50/60 shadow-teal-500/10 dark:border-teal-400/40 dark:bg-teal-500/[0.07] dark:shadow-none'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:shadow-none'
      }`}
    >
      {isConfirmingDelete ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-slate-600 dark:text-slate-300">
            Delete &ldquo;{stopwatch.name}&rdquo;?
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(stopwatch.id)}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <div className="flex flex-col gap-3">
          <input
            ref={nameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            aria-label="Stopwatch name"
            className="rounded-md bg-slate-100 px-2 py-1.5 text-sm font-medium text-slate-900 outline-none ring-1 ring-teal-500 dark:bg-slate-800 dark:text-slate-100"
          />

          <input
            ref={timeInputRef}
            value={draftTime}
            onChange={(e) => {
              // A keystroke the mask rejects — a separator, a letter — leaves the
              // value identical, so it must not arm the commit. Otherwise Save
              // would write back the snapshot taken when the editor opened and
              // destroy whatever a running stopwatch accrued in between.
              const masked = maskTime(e.target.value, showMs);
              if (masked === draftTime) return;
              setDraftTime(masked);
              setTimeTouched(true);
            }}
            onKeyDown={handleEditorKeyDown}
            inputMode="numeric"
            aria-label="Elapsed time"
            className="w-full min-w-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-2xl font-semibold tracking-tight tabular-nums text-slate-900 outline-none ring-1 ring-teal-500 dark:bg-slate-800 dark:text-slate-100"
          />

          <div className="grid grid-cols-4 gap-2">
            <NudgeButton
              label="Subtract 15 minutes"
              text="−15m"
              disabled={!canSubtract}
              onClick={() => setPendingDelta((prev) => prev - QUARTER_HOUR)}
            />
            <NudgeButton
              label="Subtract 1 minute"
              text="−1m"
              disabled={!canSubtract}
              onClick={() => setPendingDelta((prev) => prev - MINUTE)}
            />
            <NudgeButton
              label="Add 1 minute"
              text="+1m"
              onClick={() => setPendingDelta((prev) => prev + MINUTE)}
            />
            <NudgeButton
              label="Add 15 minutes"
              text="+15m"
              onClick={() => setPendingDelta((prev) => prev + QUARTER_HOUR)}
            />
          </div>

          {timeTouched && parsedDraft === null ? (
            <p role="status" className="text-xs tabular-nums text-amber-700 dark:text-amber-400">
              {pendingDelta === 0
                ? 'Minutes and seconds must be under 60 — time left unchanged'
                : `Minutes and seconds must be under 60 — only ${signedDelta} applies`}
            </p>
          ) : (parsedDraft !== null || pendingDelta !== 0) && previewElapsed !== elapsed ? (
            <p role="status" className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
              Sets to {formatTime(previewElapsed, showMs)} from {formatTime(elapsed, showMs)}
            </p>
          ) : null}

          {isConfirmingCancel ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Discard changes?</span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setIsConfirmingCancel(false)}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Keep editing
                </button>
                <button
                  onClick={closeEditor}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={save}
                className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
              >
                Save
              </button>
              <button
                onClick={requestCancel}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <h3 className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {stopwatch.name}
            </h3>
            <button
              onClick={openEditor}
              aria-label="Edit stopwatch"
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              aria-label="Delete stopwatch"
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <TrashIcon />
            </button>
          </div>

          <p
            className={`mt-4 font-mono text-4xl font-semibold tracking-tight tabular-nums ${
              isRunning ? 'text-teal-600 dark:text-teal-300' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {formatTime(elapsed, showMs)}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => (isRunning ? onPause(stopwatch.id) : onStart(stopwatch.id))}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors ${
                isRunning ? 'bg-amber-500 hover:bg-amber-400' : 'bg-teal-600 hover:bg-teal-500'
              }`}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => onReset(stopwatch.id)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface NudgeButtonProps {
  label: string;
  text: string;
  disabled?: boolean;
  onClick: () => void;
}

function NudgeButton({ label, text, disabled = false, onClick }: NudgeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border border-slate-200 px-2 py-2 text-sm font-medium tabular-nums text-slate-600 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {text}
    </button>
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
