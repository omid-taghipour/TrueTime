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

describe('StopwatchList search', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the search box with 0 or 1 stopwatches and shows it with 2+', () => {
    const { rerender, props } = renderList([]);
    expect(screen.queryByLabelText('Search stopwatches')).not.toBeInTheDocument();

    rerender(<StopwatchList stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' })]} {...props} />);
    expect(screen.queryByLabelText('Search stopwatches')).not.toBeInTheDocument();

    rerender(
      <StopwatchList
        stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]}
        {...props}
      />
    );
    expect(screen.getByLabelText('Search stopwatches')).toBeInTheDocument();
  });

  it('filters by a case-insensitive substring match on name', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Morning Run' }),
      makeStopwatch({ id: 'b', name: 'Reading' }),
      makeStopwatch({ id: 'c', name: 'Evening run' }),
    ]);

    fireEvent.change(screen.getByLabelText('Search stopwatches'), { target: { value: 'run' } });

    expect(names()).toEqual(['Morning Run', 'Evening run']);
  });

  it('shows a "no matches" message instead of the empty-state copy when search has no hits', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    fireEvent.change(screen.getByLabelText('Search stopwatches'), { target: { value: 'zzz' } });

    expect(screen.getByText('No stopwatches match “zzz”.')).toBeInTheDocument();
    expect(screen.queryByText(/Create one above/)).not.toBeInTheDocument();
  });

  it('hides a running stopwatch that does not match the search query', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha', status: 'running', lastStartedTimestamp: Date.now() }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    fireEvent.change(screen.getByLabelText('Search stopwatches'), { target: { value: 'beta' } });

    expect(names()).toEqual(['Beta']);
  });

  it('clears the search query via the clear button', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    const input = screen.getByLabelText('Search stopwatches');
    fireEvent.change(input, { target: { value: 'alpha' } });
    expect(names()).toEqual(['Alpha']);

    fireEvent.click(screen.getByLabelText('Clear search'));

    expect(input).toHaveValue('');
    expect(names()).toEqual(['Alpha', 'Beta']);
  });

  it('does not show the clear button when the query is empty', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('keeps true creation order for the "created" strategy even while filtered', () => {
    renderList([
      makeStopwatch({ id: 'a', name: 'Zeta Run' }),
      makeStopwatch({ id: 'b', name: 'Other' }),
      makeStopwatch({ id: 'c', name: 'Alpha Run' }),
    ]);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'created' } });
    fireEvent.change(screen.getByLabelText('Search stopwatches'), { target: { value: 'run' } });

    // "Zeta Run" was created before "Alpha Run", so created-order keeps it
    // first even though "Other" (created in between) is filtered out and
    // alphabetical order would put "Alpha Run" first.
    expect(names()).toEqual(['Zeta Run', 'Alpha Run']);
  });
});

describe('StopwatchList keyboard shortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('focuses the search box when "/" is pressed outside of any text field', () => {
    renderList([makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]);

    const search = screen.getByLabelText('Search stopwatches');
    expect(search).not.toHaveFocus();

    fireEvent.keyDown(window, { key: '/' });

    expect(search).toHaveFocus();
  });

  it('does not hijack "/" or Space while a dialog (e.g. the shortcuts help) is open', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha', lastActiveAt: 1_000 }),
      makeStopwatch({ id: 'b', name: 'Beta', lastActiveAt: 2_000 }),
    ]);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    const search = screen.getByLabelText('Search stopwatches');
    fireEvent.keyDown(window, { key: '/' });
    fireEvent.keyDown(window, { key: ' ' });

    expect(search).not.toHaveFocus();
    expect(props.onStart).not.toHaveBeenCalled();
    expect(props.onPause).not.toHaveBeenCalled();
    document.body.removeChild(dialog);
  });

  it('does not hijack "/" while the user is already typing in a field', () => {
    render(
      <div>
        <input data-testid="other-field" />
        <StopwatchList
          stopwatches={[makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]}
          {...handlers()}
        />
      </div>
    );

    const otherField = screen.getByTestId('other-field');
    otherField.focus();
    fireEvent.keyDown(otherField, { key: '/' });

    expect(otherField).toHaveFocus();
    expect(screen.getByLabelText('Search stopwatches')).not.toHaveFocus();
  });

  it('clears the search query and blurs on Escape', () => {
    renderList([makeStopwatch({ id: 'a', name: 'Alpha' }), makeStopwatch({ id: 'b', name: 'Beta' })]);

    const search = screen.getByLabelText('Search stopwatches');
    fireEvent.change(search, { target: { value: 'alpha' } });
    expect(names()).toEqual(['Alpha']);

    fireEvent.keyDown(search, { key: 'Escape' });

    expect(search).toHaveValue('');
    expect(search).not.toHaveFocus();
    expect(names()).toEqual(['Alpha', 'Beta']);
  });

  it('pauses the running stopwatch on Space, since it is always on top', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta', status: 'running', lastStartedTimestamp: Date.now() }),
    ]);

    fireEvent.keyDown(window, { key: ' ' });

    expect(props.onPause).toHaveBeenCalledWith('b');
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it('starts the topmost stopwatch on Space when nothing is running', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha', lastActiveAt: 1_000 }),
      makeStopwatch({ id: 'b', name: 'Beta', lastActiveAt: 2_000 }),
    ]);

    fireEvent.keyDown(window, { key: ' ' });

    expect(props.onStart).toHaveBeenCalledWith('b');
  });

  it('does not toggle on Space while the user is typing in a field', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    fireEvent.keyDown(screen.getByLabelText('Search stopwatches'), { key: ' ' });

    expect(props.onStart).not.toHaveBeenCalled();
    expect(props.onPause).not.toHaveBeenCalled();
  });

  it('does nothing on Space when search has filtered out every stopwatch', () => {
    const { props } = renderList([
      makeStopwatch({ id: 'a', name: 'Alpha' }),
      makeStopwatch({ id: 'b', name: 'Beta' }),
    ]);

    fireEvent.change(screen.getByLabelText('Search stopwatches'), { target: { value: 'zzz' } });
    fireEvent.keyDown(window, { key: ' ' });

    expect(props.onStart).not.toHaveBeenCalled();
    expect(props.onPause).not.toHaveBeenCalled();
  });
});
