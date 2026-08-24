/**
 * Parses a duration string into milliseconds — the inverse of formatTime.
 *
 * Accepts `HH:MM:SS`, `MM:SS`, and `SS`, each with an optional fractional
 * seconds part (`01:30:00.25`). Hours are unbounded, matching formatTime,
 * which doesn't cap them either. Returns null for anything it can't read,
 * so callers can revert to the previous value instead of handling errors.
 */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d{1,3}))?$/);
  if (!match) return null;

  const [, rawHours, rawMinutes, rawSeconds, rawFraction] = match;
  const hours = rawHours === undefined ? 0 : Number(rawHours);
  const minutes = rawMinutes === undefined ? 0 : Number(rawMinutes);
  const seconds = Number(rawSeconds);

  // Only the leading unit may exceed its natural range: "90" is 90 seconds,
  // but the 90 in "90:00" is minutes, and "01:90:00" is nonsense.
  if (rawMinutes !== undefined && seconds > 59) return null;
  if (rawHours !== undefined && minutes > 59) return null;

  // ".5" is five tenths, ".05" is five hundredths — pad, don't just divide.
  const fraction = rawFraction === undefined ? 0 : Number(rawFraction.padEnd(3, '0'));

  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + fraction;
}
