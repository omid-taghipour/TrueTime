/** Formats a millisecond duration as HH:MM:SS, or HH:MM:SS.cc (centiseconds) when showMs is true. */
export function formatTime(ms: number, showMs = false): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const centis = Math.floor((safeMs % 1000) / 10);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (showMs) {
    const cc = String(centis).padStart(2, '0');
    return `${hh}:${mm}:${ss}.${cc}`;
  }
  return `${hh}:${mm}:${ss}`;
}
