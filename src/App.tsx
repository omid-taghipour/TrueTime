import { useStopwatches } from './hooks/useStopwatches';
import { CreateStopwatchForm } from './components/CreateStopwatchForm';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { StopwatchList } from './components/StopwatchList';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const {
    stopwatches,
    createStopwatch,
    renameStopwatch,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    deleteStopwatch,
    clearAllStopwatches,
  } = useStopwatches();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              True<span className="text-teal-500 dark:text-teal-400">Time</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">Only one stopwatch can run at a time.</p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <KeyboardShortcutsHelp />
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-6">
          <CreateStopwatchForm onCreate={createStopwatch} />
        </div>

        <StopwatchList
          stopwatches={stopwatches}
          onStart={startStopwatch}
          onPause={pauseStopwatch}
          onReset={resetStopwatch}
          onDelete={deleteStopwatch}
          onRename={renameStopwatch}
          onClearAll={clearAllStopwatches}
        />
      </div>
    </main>
  );
}
