import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  it('is closed by default and opens via the help button', () => {
    render(<KeyboardShortcutsHelp />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('toggles open and closed when "?" is pressed', () => {
    render(<KeyboardShortcutsHelp />);

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open on "?" while the user is typing in a field', () => {
    render(
      <div>
        <input data-testid="text-field" />
        <KeyboardShortcutsHelp />
      </div>
    );

    const field = screen.getByTestId('text-field');
    fireEvent.keyDown(field, { key: '?' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and on clicking the backdrop', () => {
    render(<KeyboardShortcutsHelp />);

    fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
