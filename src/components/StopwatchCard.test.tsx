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
    lastActiveAt: null,
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
        onSetElapsed={vi.fn()}
        onAdjustElapsed={vi.fn()}
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
        onSetElapsed={vi.fn()}
        onAdjustElapsed={vi.fn()}
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
        onSetElapsed={vi.fn()}
        onAdjustElapsed={vi.fn()}
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

function renderCard(
  stopwatch: Stopwatch,
  overrides: { onSetElapsed?: () => void; onAdjustElapsed?: () => void } = {}
) {
  const props = { onSetElapsed: vi.fn(), onAdjustElapsed: vi.fn(), ...overrides };
  render(
    <StopwatchCard
      stopwatch={stopwatch}
      onStart={vi.fn()}
      onPause={vi.fn()}
      onReset={vi.fn()}
      onDelete={vi.fn()}
      onRename={vi.fn()}
      {...props}
    />
  );
  return props;
}

describe('StopwatchCard time adjustment', () => {
  it('nudges by a quarter hour in both directions', () => {
    const onAdjustElapsed = vi.fn();
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }), { onAdjustElapsed });

    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', 900_000);

    fireEvent.click(screen.getByLabelText('Subtract 15 minutes'));
    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', -900_000);
  });

  it('nudges by a single minute in both directions', () => {
    const onAdjustElapsed = vi.fn();
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }), { onAdjustElapsed });

    fireEvent.click(screen.getByLabelText('Add 1 minute'));
    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', 60_000);

    fireEvent.click(screen.getByLabelText('Subtract 1 minute'));
    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', -60_000);
  });

  it('disables the subtract buttons at zero but leaves the add buttons live', () => {
    renderCard(makeStopwatch({ accumulatedTime: 0 }));

    expect(screen.getByLabelText('Subtract 15 minutes')).toBeDisabled();
    expect(screen.getByLabelText('Subtract 1 minute')).toBeDisabled();
    expect(screen.getByLabelText('Add 15 minutes')).toBeEnabled();
    expect(screen.getByLabelText('Add 1 minute')).toBeEnabled();
  });
});

describe('StopwatchCard time editing', () => {
  it('opens an editor prefilled with the current time and commits on Enter', () => {
    const onSetElapsed = vi.fn();
    renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }), { onSetElapsed });

    fireEvent.click(screen.getByLabelText('Edit elapsed time'));
    const input = screen.getByLabelText('Elapsed time');
    // Milliseconds are on by default, so the draft carries centiseconds too.
    expect(input).toHaveValue('01:02:03.00');

    fireEvent.change(input, { target: { value: '02:30:00' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSetElapsed).toHaveBeenCalledWith('sw-1', 9_000_000);
    expect(screen.queryByLabelText('Elapsed time')).not.toBeInTheDocument();
  });

  it('reverts unparseable input without changing anything', () => {
    const onSetElapsed = vi.fn();
    renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }), { onSetElapsed });

    fireEvent.click(screen.getByLabelText('Edit elapsed time'));
    const input = screen.getByLabelText('Elapsed time');
    fireEvent.change(input, { target: { value: 'not a time' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Edit elapsed time')).toHaveTextContent('01:02:03');
  });

  it('cancels on Escape without committing the draft', () => {
    const onSetElapsed = vi.fn();
    renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }), { onSetElapsed });

    fireEvent.click(screen.getByLabelText('Edit elapsed time'));
    const input = screen.getByLabelText('Elapsed time');
    fireEvent.change(input, { target: { value: '09:09:09' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Edit elapsed time')).toHaveTextContent('01:02:03');
  });

  it('hides the nudge buttons while the editor is open', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }));

    fireEvent.click(screen.getByLabelText('Edit elapsed time'));

    expect(screen.queryByLabelText('Add 15 minutes')).not.toBeInTheDocument();
  });
});
