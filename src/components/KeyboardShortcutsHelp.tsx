import { useEffect, useState } from 'react';
import { isTypingTarget } from '../lib/isTypingTarget';

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '/', description: 'Focus the search box' },
  { keys: 'N', description: 'Focus the new stopwatch field' },
  { keys: 'Space', description: 'Start or pause the top stopwatch' },
  { keys: 'Esc', description: 'Clear search / cancel renaming' },
  { keys: '?', description: 'Toggle this help' },
];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (event.key === '?' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Keyboard shortcuts"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-500 transition-colors hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <QuestionIcon />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Keyboard shortcuts</h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <XIcon />
              </button>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {SHORTCUTS.map(({ keys, description }) => (
                <li key={keys} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{description}</span>
                  <kbd className="rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.443.323-.17.589-.444.589-.807a1.5 1.5 0 0 0-2.98-.32.75.75 0 0 1 0 .26ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
