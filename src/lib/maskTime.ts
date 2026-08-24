/** Most hour digits the mask will hold — 9999h is ~416 days, far past any real use. */
const MAX_HOUR_DIGITS = 4;

/**
 * Reformats free text into the fixed `HH:MM:SS[.cc]` shape, keeping only its
 * digits and filling them in from the right like an ATM amount entry.
 *
 * The separators are regenerated on every keystroke rather than typed, so they
 * cannot be deleted and the field can never hold a shapeless value. Typing a
 * non-digit is a no-op: it leaves the digit sequence alone, so the value comes
 * back unchanged.
 *
 * Segments are *not* range-checked here — `00:00:99.99` is reachable by typing
 * four 9s, and parseTime rejects it. Clamping mid-keystroke would fight the
 * user while they are still typing the second digit.
 */
export function maskTime(input: string, showMs = false): string {
  const width = showMs ? 8 : 6;
  // Leading zeros are padding, not entry. Keeping them would make every new
  // digit grow the hours field instead of shifting through the mask, so a
  // fresh `00:00:00` plus one keystroke became `000:00:03`.
  const digits = input.replace(/\D/g, '').replace(/^0+/, '').slice(0, width + MAX_HOUR_DIGITS - 2);
  const padded = digits.padStart(width, '0');

  const centis = showMs ? padded.slice(-2) : '';
  const whole = showMs ? padded.slice(0, -2) : padded;

  const seconds = whole.slice(-2);
  const minutes = whole.slice(-4, -2);
  const hours = whole.slice(0, -4);

  return `${hours}:${minutes}:${seconds}${showMs ? `.${centis}` : ''}`;
}
