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
  overrides: {
    onSetElapsed?: () => void;
    onAdjustElapsed?: () => void;
    onRename?: () => void;
  } = {}
) {
  const props = {
    onSetElapsed: vi.fn(),
    onAdjustElapsed: vi.fn(),
    onRename: vi.fn(),
    ...overrides,
  };
  render(
    <StopwatchCard
      stopwatch={stopwatch}
      onStart={vi.fn()}
      onPause={vi.fn()}
      onReset={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />
  );
  return props;
}

function openEditor() {
  fireEvent.click(screen.getByLabelText('Edit stopwatch'));
}

describe('StopwatchCard editor', () => {
  it('seeds the time field from the current elapsed time', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }));

    openEditor();

    // Milliseconds are on by default, so the draft carries centiseconds too.
    expect(screen.getByLabelText('Elapsed time')).toHaveValue('01:02:03.00');
  });

  it('commits a typed absolute time on Save', () => {
    const { onSetElapsed } = renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSetElapsed).toHaveBeenCalledWith('sw-1', 9_000_000);
    expect(screen.queryByLabelText('Elapsed time')).not.toBeInTheDocument();
  });

  it('leaves the time alone when the field was never touched', () => {
    // Regression: the editor used to commit the snapshot taken when it opened,
    // silently destroying whatever a running stopwatch accrued in the meantime.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const { onSetElapsed, onAdjustElapsed } = renderCard(
      makeStopwatch({ status: 'running', accumulatedTime: 0, lastStartedTimestamp: 10_000 })
    );

    openEditor();
    nowSpy.mockReturnValue(14_000);
    fireEvent.change(screen.getByLabelText('Stopwatch name'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(onAdjustElapsed).not.toHaveBeenCalled();
  });

  it('renames on Save', () => {
    const { onRename } = renderCard(makeStopwatch());

    openEditor();
    fireEvent.change(screen.getByLabelText('Stopwatch name'), { target: { value: 'Writing' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onRename).toHaveBeenCalledWith('sw-1', 'Writing');
  });

  it('reverts an out-of-range entry without changing anything', () => {
    const { onSetElapsed, onAdjustElapsed } = renderCard(
      makeStopwatch({ accumulatedTime: 3_723_000 })
    );

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '9999' } });
    expect(screen.getByLabelText('Elapsed time')).toHaveValue('00:00:99.99');

    fireEvent.click(screen.getByText('Save'));

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(onAdjustElapsed).not.toHaveBeenCalled();
  });

  it('keeps the separators when the entry is retyped without them', () => {
    const { onSetElapsed } = renderCard(makeStopwatch({ accumulatedTime: 3_723_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '01000000' } });
    expect(screen.getByLabelText('Elapsed time')).toHaveValue('01:00:00.00');

    fireEvent.click(screen.getByText('Save'));
    expect(onSetElapsed).toHaveBeenCalledWith('sw-1', 3_600_000);
  });

  it('does not arm the commit when a keystroke changes nothing', () => {
    // Regression: deleting a separator fires onChange but the mask puts it
    // straight back. Treating that as an edit re-opened the data-loss path —
    // Save would write the snapshot from when the editor opened.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const { onSetElapsed, onAdjustElapsed } = renderCard(
      makeStopwatch({ status: 'running', accumulatedTime: 0, lastStartedTimestamp: 10_000 })
    );

    openEditor();
    // What the DOM holds after backspacing over the second colon.
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '00:0000.00' } });

    expect(screen.queryByText(/Sets to/)).not.toBeInTheDocument();

    nowSpy.mockReturnValue(14_000);
    fireEvent.click(screen.getByText('Save'));

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(onAdjustElapsed).not.toHaveBeenCalled();
  });

  it('ignores a typed letter instead of blanking the field', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    // What the DOM holds after typing "x" at the end of a full field.
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '01:00:00.00x' } });

    expect(screen.getByLabelText('Elapsed time')).toHaveValue('01:00:00.00');
  });

  it('commits nothing on Cancel or Escape', () => {
    const { onSetElapsed, onAdjustElapsed, onRename } = renderCard(
      makeStopwatch({ accumulatedTime: 3_723_000 })
    );

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '09:09:09' } });
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Discard'));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '09:09:09' } });
    fireEvent.keyDown(screen.getByLabelText('Elapsed time'), { key: 'Escape' });
    fireEvent.click(screen.getByText('Discard'));

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(onAdjustElapsed).not.toHaveBeenCalled();
    expect(onRename).not.toHaveBeenCalled();
  });
});

describe('StopwatchCard nudges', () => {
  it('defers a nudge until Save', () => {
    const { onAdjustElapsed } = renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    expect(onAdjustElapsed).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Save'));
    expect(onAdjustElapsed).toHaveBeenCalledTimes(1);
    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', 900_000);
  });

  it('accumulates nudges of both sizes into one delta', () => {
    const { onAdjustElapsed } = renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByLabelText('Add 1 minute'));
    fireEvent.click(screen.getByLabelText('Subtract 1 minute'));
    fireEvent.click(screen.getByText('Save'));

    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', 900_000);
  });

  it('round-trips +15m then -15m to no change at all', () => {
    const { onAdjustElapsed, onSetElapsed } = renderCard(
      makeStopwatch({ accumulatedTime: 3_600_000 })
    );

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByLabelText('Subtract 15 minutes'));
    fireEvent.click(screen.getByText('Save'));

    expect(onAdjustElapsed).not.toHaveBeenCalled();
    expect(onSetElapsed).not.toHaveBeenCalled();
  });

  it('folds a nudge into a typed value as a single absolute set', () => {
    const { onSetElapsed, onAdjustElapsed } = renderCard(makeStopwatch());

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '01:00:00.00' } });
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByText('Save'));

    expect(onSetElapsed).toHaveBeenCalledWith('sw-1', 4_500_000);
    expect(onAdjustElapsed).not.toHaveBeenCalled();
  });

  it('disables the subtract buttons at zero but leaves the add buttons live', () => {
    renderCard(makeStopwatch({ accumulatedTime: 0 }));

    openEditor();

    expect(screen.getByLabelText('Subtract 15 minutes')).toBeDisabled();
    expect(screen.getByLabelText('Subtract 1 minute')).toBeDisabled();
    expect(screen.getByLabelText('Add 15 minutes')).toBeEnabled();
    expect(screen.getByLabelText('Add 1 minute')).toBeEnabled();
  });

  it('re-disables the subtract buttons once the pending delta reaches zero', () => {
    renderCard(makeStopwatch({ accumulatedTime: 900_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Subtract 15 minutes'));

    expect(screen.getByLabelText('Subtract 15 minutes')).toBeDisabled();
  });

  it('shows the summary only once a nudge is made', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    expect(screen.queryByText(/Sets to/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    expect(screen.getByText('Sets to 01:15:00.00 from 01:00:00.00')).toBeInTheDocument();
  });

  it('bounds the subtract buttons against a typed value, not the stored one', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    expect(screen.getByLabelText('Subtract 15 minutes')).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '00:00:00' } });
    expect(screen.getByLabelText('Subtract 15 minutes')).toBeDisabled();
  });
});

describe('StopwatchCard pending summary', () => {
  it('previews the result of a typed value', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });

    expect(screen.getByText('Sets to 02:30:00.00 from 01:00:00.00')).toBeInTheDocument();
  });

  it('folds a nudge into the previewed result', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));

    expect(screen.getByText('Sets to 02:45:00.00 from 01:00:00.00')).toBeInTheDocument();
  });

  it('hides the summary when the entry matches the current time', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    expect(screen.getByText('Sets to 02:30:00.00 from 01:00:00.00')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '01:00:00.00' } });
    expect(screen.queryByText(/Sets to/)).not.toBeInTheDocument();
  });

  it('hides the summary when nudges cancel back to the current time', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    expect(screen.getByText(/Sets to/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Subtract 15 minutes'));
    expect(screen.queryByText(/Sets to/)).not.toBeInTheDocument();
  });

  it('warns that an out-of-range entry will be ignored', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '9999' } });

    expect(
      screen.getByText('Minutes and seconds must be under 60 — time left unchanged')
    ).toBeInTheDocument();
  });

  it('says the nudge still applies when the entry is out of range', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '9999' } });

    expect(
      screen.getByText('Minutes and seconds must be under 60 — only +00:15:00 applies')
    ).toBeInTheDocument();
  });

  it('applies the nudge on save even when the entry is out of range', () => {
    const { onSetElapsed, onAdjustElapsed } = renderCard(
      makeStopwatch({ accumulatedTime: 3_600_000 })
    );

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '9999' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(onAdjustElapsed).toHaveBeenCalledWith('sw-1', 900_000);
  });

  it('treats a cleared field as zero rather than as an error', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    expect(screen.getByText('Sets to 02:45:00.00 from 01:00:00.00')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '' } });
    expect(screen.getByLabelText('Elapsed time')).toHaveValue('00:00:00.00');
    expect(screen.getByText('Sets to 00:15:00.00 from 01:00:00.00')).toBeInTheDocument();
  });
});

describe('StopwatchCard discard confirmation', () => {
  it('closes straight away when nothing was changed', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Elapsed time')).not.toBeInTheDocument();
  });

  it('asks before discarding a typed time', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    expect(screen.getByLabelText('Elapsed time')).toBeInTheDocument();
  });

  it('asks before discarding a pending nudge', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
  });

  it('asks before discarding a renamed stopwatch', () => {
    renderCard(makeStopwatch());

    openEditor();
    fireEvent.change(screen.getByLabelText('Stopwatch name'), { target: { value: 'Writing' } });
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
  });

  it('asks before discarding an out-of-range entry', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '9999' } });
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
  });

  it('does not ask when a keystroke the mask rejected changed nothing', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '01:0000.00' } });
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Elapsed time')).not.toBeInTheDocument();
  });

  it('keeps the draft intact when the discard is declined', () => {
    const { onSetElapsed } = renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Keep editing'));

    expect(screen.getByLabelText('Elapsed time')).toHaveValue('02:30:00.00');
    expect(screen.getByText('Save')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save'));
    expect(onSetElapsed).toHaveBeenCalledWith('sw-1', 9_000_000);
  });

  it('backs out of the prompt on Escape instead of dead-ending', () => {
    renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.keyDown(screen.getByLabelText('Elapsed time'), { key: 'Escape' });

    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not let Enter commit the change the prompt is asking about', () => {
    const { onSetElapsed, onAdjustElapsed } = renderCard(
      makeStopwatch({ accumulatedTime: 3_600_000 })
    );

    openEditor();
    fireEvent.click(screen.getByLabelText('Add 15 minutes'));
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.keyDown(screen.getByLabelText('Elapsed time'), { key: 'Enter' });

    expect(onSetElapsed).not.toHaveBeenCalled();
    expect(onAdjustElapsed).not.toHaveBeenCalled();
    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
  });

  it('discards the draft when confirmed and does not reopen dirty', () => {
    const { onSetElapsed } = renderCard(makeStopwatch({ accumulatedTime: 3_600_000 }));

    openEditor();
    fireEvent.change(screen.getByLabelText('Elapsed time'), { target: { value: '02:30:00.00' } });
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Discard'));

    expect(onSetElapsed).not.toHaveBeenCalled();

    openEditor();
    expect(screen.getByLabelText('Elapsed time')).toHaveValue('01:00:00.00');
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
  });
});
