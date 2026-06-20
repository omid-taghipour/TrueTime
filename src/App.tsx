import { useStopwatches } from './hooks/useStopwatches';
import { CreateStopwatchForm } from './components/CreateStopwatchForm';
import { StopwatchList } from './components/StopwatchList';
import { UpdateBanner } from './components/UpdateBanner';

export default function App() {
  const {
    stopwatches,
    createStopwatch,
    renameStopwatch,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    deleteStopwatch,
  } = useStopwatches();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold tracking-tight">TrueTime</h1>
        <p className="mt-1 text-sm text-slate-500">Only one stopwatch can run at a time.</p>

        <div className="mt-6">
          <UpdateBanner />
          <CreateStopwatchForm onCreate={createStopwatch} />
        </div>

        <StopwatchList
          stopwatches={stopwatches}
          onStart={startStopwatch}
          onPause={pauseStopwatch}
          onReset={resetStopwatch}
          onDelete={deleteStopwatch}
          onRename={renameStopwatch}
        />
      </div>
    </main>
  );
}
