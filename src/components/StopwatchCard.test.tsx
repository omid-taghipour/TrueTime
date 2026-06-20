import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Stopwatch } from '../types/stopwatch';
import { StopwatchCard } from './StopwatchCard';

function makeStopwatch(overrides: Partial<Stopwatch> = {}): Stopwatch {
  return {
    id: 'sw-1',
    name: 'Reading',
    status: 'stopped',
    accumulatedTime: 0,
    lastStartedTimestamp: null,
    ...overrides,
  };
}

describe('StopwatchCard delete confirmation', () => {
  it('does not delete immediately when the trash icon is clicked', () => {
    const onDelete = vi.fn();
    render(
      <StopwatchCard
        stopwatch={makeStopwatch()}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onReset={vi.fn()}
        onDelete={onDelete}
        onRename={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Delete stopwatch'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete “Reading”?')).toBeInTheDocument();
  });

  it('cancels back to the normal view without deleting', () => {
    const onDelete = vi.fn();
    render(
      <StopwatchCard
        stopwatch={makeStopwatch()}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onReset={vi.fn()}
        onDelete={onDelete}
        onRename={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Delete stopwatch'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete “Reading”?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Delete stopwatch')).toBeInTheDocument();
  });

  it('deletes only after confirming', () => {
    const onDelete = vi.fn();
    render(
      <StopwatchCard
        stopwatch={makeStopwatch()}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onReset={vi.fn()}
        onDelete={onDelete}
        onRename={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Delete stopwatch'));
    fireEvent.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('sw-1');
  });
});
