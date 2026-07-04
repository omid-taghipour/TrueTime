import { describe, expect, it } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('formats zero', () => {
    expect(formatTime(0)).toBe('00:00:00');
  });

  it('floors sub-second durations to zero seconds', () => {
    expect(formatTime(999)).toBe('00:00:00');
  });

  it('rolls milliseconds into seconds', () => {
    expect(formatTime(1_000)).toBe('00:00:01');
  });

  it('formats minutes and seconds together', () => {
    expect(formatTime(61_500)).toBe('00:01:01');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3_661_001)).toBe('01:01:01');
  });

  it('pads hours past 99 without truncating', () => {
    expect(formatTime(360_000_000)).toBe('100:00:00');
  });

  it('clamps negative durations to zero', () => {
    expect(formatTime(-50)).toBe('00:00:00');
  });

  it('floors fractional milliseconds', () => {
    expect(formatTime(1_999.7)).toBe('00:00:01');
  });
});

describe('formatTime with showMs', () => {
  it('appends .00 centiseconds when duration is zero', () => {
    expect(formatTime(0, true)).toBe('00:00:00.00');
  });

  it('shows centiseconds (floor to 2 digits)', () => {
    expect(formatTime(1_550, true)).toBe('00:00:01.55');
  });

  it('pads centiseconds below 10 with a leading zero', () => {
    expect(formatTime(1_050, true)).toBe('00:00:01.05');
  });

  it('rolls over centiseconds at 1000ms boundary', () => {
    expect(formatTime(1_999, true)).toBe('00:00:01.99');
  });

  it('clamps negative durations to zero with showMs', () => {
    expect(formatTime(-100, true)).toBe('00:00:00.00');
  });
});
