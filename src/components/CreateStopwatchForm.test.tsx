import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateStopwatchForm } from './CreateStopwatchForm';

describe('CreateStopwatchForm', () => {
  it('creates a stopwatch with the entered name and clears the field', () => {
    const onCreate = vi.fn();
    render(<CreateStopwatchForm onCreate={onCreate} />);

    const input = screen.getByPlaceholderText(/New stopwatch name/);
    fireEvent.change(input, { target: { value: 'Errands' } });
    fireEvent.click(screen.getByText('Add'));

    expect(onCreate).toHaveBeenCalledWith('Errands');
    expect(input).toHaveValue('');
  });

  it('focuses the name field when "n" is pressed outside of any text field', () => {
    render(<CreateStopwatchForm onCreate={vi.fn()} />);

    const input = screen.getByPlaceholderText(/New stopwatch name/);
    expect(input).not.toHaveFocus();

    fireEvent.keyDown(window, { key: 'n' });

    expect(input).toHaveFocus();
  });

  it('does not hijack "n" while a dialog (e.g. the shortcuts help) is open', () => {
    render(<CreateStopwatchForm onCreate={vi.fn()} />);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    const input = screen.getByPlaceholderText(/New stopwatch name/);
    fireEvent.keyDown(window, { key: 'n' });

    expect(input).not.toHaveFocus();
    document.body.removeChild(dialog);
  });

  it('does not hijack "n" while the user is already typing in a field', () => {
    render(
      <div>
        <input data-testid="other-field" />
        <CreateStopwatchForm onCreate={vi.fn()} />
      </div>
    );

    const otherField = screen.getByTestId('other-field');
    otherField.focus();
    fireEvent.keyDown(otherField, { key: 'n' });

    expect(otherField).toHaveFocus();
  });

  it('clears and blurs the name field on Escape', () => {
    render(<CreateStopwatchForm onCreate={vi.fn()} />);

    const input = screen.getByPlaceholderText(/New stopwatch name/);
    input.focus();
    fireEvent.change(input, { target: { value: 'Draft name' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('');
    expect(input).not.toHaveFocus();
  });
});
