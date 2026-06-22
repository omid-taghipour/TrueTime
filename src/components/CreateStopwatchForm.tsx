import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isDialogOpen } from '../lib/isDialogOpen';
import { isTypingTarget } from '../lib/isTypingTarget';

interface CreateStopwatchFormProps {
  onCreate: (name: string) => void;
}

export function CreateStopwatchForm({ onCreate }: CreateStopwatchFormProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || isDialogOpen()) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setName('');
            inputRef.current?.blur();
          }
        }}
        placeholder="New stopwatch name... (n)"
        className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-slate-200 transition-shadow focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-slate-700"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 active:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
