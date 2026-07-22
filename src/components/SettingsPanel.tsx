import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useShowMilliseconds } from '../hooks/useShowMilliseconds';
import type { Stopwatch } from '../types/stopwatch';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { parseStopwatchImport, serializeStopwatches } from '../lib/stopwatchIO';

interface SettingsPanelProps {
  stopwatches: Stopwatch[];
  onImport: (list: Stopwatch[]) => void;
}

export function SettingsPanel({ stopwatches, onImport }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { showMs, setShowMs } = useShowMilliseconds();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Stopwatch[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = async () => {
    const json = serializeStopwatches(stopwatches);
    const defaultName = `truetime-${new Date().toISOString().slice(0, 10)}.json`;

    // Desktop: native Save As dialog (the <a download> click is a no-op in
    // Tauri's webview). Web/Docker build: fall back to a browser download.
    if (isTauri()) {
      await invoke('export_stopwatches', { contents: json, defaultName });
      return;
    }

    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      setImportError(null);
      setPendingImport(parseStopwatchImport(await file.text()));
    } catch (err) {
      setPendingImport(null);
      setImportError(err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
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
        aria-label="Settings"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-500 transition-colors hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <GearIcon />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <XIcon />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">Theme</span>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">Show milliseconds</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showMs}
                  onClick={() => setShowMs(!showMs)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                    showMs ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      showMs ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-300">Data</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleFilePicked}
                  className="hidden"
                />
                {pendingImport ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/40">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Replace all {stopwatches.length} stopwatch{stopwatches.length === 1 ? '' : 'es'} with{' '}
                      {pendingImport.length} from the file? This can't be undone.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingImport(null)}
                        className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onImport(pendingImport);
                          setPendingImport(null);
                        }}
                        className="flex-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Import
                    </button>
                  </div>
                )}
                {importError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
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
