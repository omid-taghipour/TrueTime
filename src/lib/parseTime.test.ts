import { describe, expect, it } from 'vitest';
import { formatTime } from './formatTime';
import { parseTime } from './parseTime';

describe('parseTime', () => {
  it('parses HH:MM:SS', () => {
    expect(parseTime('01:30:00')).toBe(5_400_000);
    expect(parseTime('00:00:00')).toBe(0);
    expect(parseTime('1:2:3')).toBe(3_723_000);
  });

  it('parses MM:SS and bare seconds', () => {
    expect(parseTime('05:30')).toBe(330_000);
    expect(parseTime('45')).toBe(45_000);
  });

  it('parses fractional seconds by place value', () => {
    expect(parseTime('00:00:01.5')).toBe(1_500);
    expect(parseTime('00:00:01.05')).toBe(1_050);
    expect(parseTime('00:00:01.005')).toBe(1_005);
  });

  it('leaves the leading unit unbounded', () => {
    expect(parseTime('100:00:00')).toBe(360_000_000);
    expect(parseTime('90:00')).toBe(5_400_000);
    expect(parseTime('90')).toBe(90_000);
  });

  it('rejects out-of-range trailing units', () => {
    expect(parseTime('01:90:00')).toBeNull();
    expect(parseTime('01:00:90')).toBeNull();
    expect(parseTime('05:90')).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseTime('  01:30:00  ')).toBe(5_400_000);
  });

  it('returns null for anything it cannot read', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('   ')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime('-5')).toBeNull();
    expect(parseTime('1:2:3:4')).toBeNull();
    expect(parseTime('01:30:')).toBeNull();
    expect(parseTime('1.2.3')).toBeNull();
  });

  it('round-trips formatTime output in both precisions', () => {
    for (const ms of [0, 1_000, 61_000, 5_400_000, 360_000_000]) {
      expect(parseTime(formatTime(ms))).toBe(ms);
      expect(parseTime(formatTime(ms, true))).toBe(ms);
    }
    // Centisecond output is lossy below 10ms, so it round-trips floored.
    expect(parseTime(formatTime(1_234, true))).toBe(1_230);
  });
});
