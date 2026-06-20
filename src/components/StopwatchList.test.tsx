import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stopwatch } from '../types/stopwatch';
import { StopwatchList } from './StopwatchList';

function makeStopwatch(overrides: Partial<Stopwatch> = {}): Stopwatch {
  return {
    id: 'sw-1',
    name: 'Untitled',
    status: 'stopped',
    accumulatedTime: 0,
    lastStartedTimestamp: null,
    lastActiveAt: null,
    ...overrides,
  };
}

function handlers() {
  return {
    onStart: vi.fn(),
    onPause: vi.fn(),
    onReset: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onClearAll: vi.fn(),
  };
}

function renderList(stopwatches: Stopwatch[], overrides: Partial<ReturnType<typeof handlers>> = {}) {
  const props = { ...handlers(), ...overrides };
  const result = render(<StopwatchList stopwatches={stopwatches} {...props} />);
  return { ...result, props };
}

function names() {
  return screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
}

describe('StopwatchList ordering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps stable order when nothing is running', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta', status: 'paused' }),
      makeStopwatch({ id: 'c', name: 'Gamma' }),
    ]);

    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('floats the running stopwatch to the top without reordering the rest', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta', status: 'running', lastStartedTimestamp: Date.now() }),
      makeStopwatch({ id: 'c', name: 'Gamma' }),
      makeStopwatch({ id: 'd', name: 'Delta', status: 'paused' }),
    ]);

    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma', 'Delta']);
  });

  it('orders non-running stopwatches by most recently used first (default strategy)', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha', lastActiveAt: 1_000 }),
      makeStopwatch({ id: 'b', name: 'Beta', lastActiveAt: 3_000 }),
      makeStopwatch({ id: 'c', name: 'Gamma', lastActiveAt: null }),
      makeStopwatch({ id: 'd', name: 'Delta', lastActiveAt: 2_000 }),
    ]);

    expect(names()).toEqual(['Beta', 'Delta', 'Alpha', 'Gamma']);
  });
});

describe('StopwatchList sort strategy selector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the selector with 0 or 1 stopwatches and shows it with 2+', () => {
    const { rerender, props } = renderList([]);
    expect(screen.queryByLabelText('Sort by')).not.toBeInTheDocument();

    rerender(<StopwatchList stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' })]} {...props} />);
    expect(screen.queryByLabelText('Sort by')).not.toBeInTheDocument();

    rerender(
      <StopwatchList
        stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]}
        {...props}
      />
    );
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('defaults to the "recent" strategy', () => {
    renderList([makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]);

    expect(screen.getByLabelText('Sort by')).toHaveValue('recent');
  });

  it('switching to "name" reorders the list alphabetically', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Gamma', lastActiveAt: 3_000 }),
      makeStopwatch({ id: 'b', name: 'Alpha', lastActiveAt: 1_000 }),
      makeStopwatch({ id: 'c', name: 'Beta', lastActiveAt: 2_000 }),
    ]);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });

    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('switching to "created" restores original insertion order regardless of recency', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Gamma', lastActiveAt: 1_000 }),
      makeStopwatch({ id: 'b', name: 'Alpha', lastActiveAt: 3_000 }),
      makeStopwatch({ id: 'c', name: 'Beta', lastActiveAt: 2_000 }),
    ]);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'created' } });

    expect(names()).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('still floats the running stopwatch above the chosen strategy order', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Gamma' }),
      makeStopwatch({ id: 'b', name: 'Alpha', status: 'running', lastStartedTimestamp: Date.now() }),
      makeStopwatch({ id: 'c', name: 'Beta' }),
    ]);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });

    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('persists the chosen strategy to localStorage', () => {
    renderList([makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });

    expect(localStorage.getItem('sortStrategy')).toBe('name');
  });
});

describe('StopwatchList clear all', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the "Clear all" button with 0 or 1 stopwatches and shows it with 2+', () => {
    const { rerender, props } = renderList([]);
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();

    rerender(<StopwatchList stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' })]} {...props} />);
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();

    rerender(
      <StopwatchList
        stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]}
        {...props}
      />
    );
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('does not clear immediately and shows a confirmation with the exact count', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
      makeStopwatch({ id: 'c', name: 'Gamma' }),
    ]);

    fireEvent.click(screen.getByText('Clear all'));

    expect(props.onClearAll).not.toHaveBeenCalled();
    expect(screen.getByText('Delete all 3 stopwatches?')).toBeInTheDocument();
  });

  it('cancels back to the normal view without clearing', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    fireEvent.click(screen.getByText('Clear all'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(props.onClearAll).not.toHaveBeenCalled();
    expect(screen.queryByText(/Delete all/)).not.toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('clears only after confirming', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    fireEvent.click(screen.getByText('Clear all'));
    fireEvent.click(screen.getByText('Delete all'));

    expect(props.onClearAll).toHaveBeenCalledTimes(1);
  });
});
