import { describe, expect, it } from 'vitest';
import { maskTime } from './maskTime';

describe('maskTime', () => {
  it('fills digits in from the right', () => {
    expect(maskTime('2', true)).toBe('00:00:00.02');
    expect(maskTime('23', true)).toBe('00:00:00.23');
    expect(maskTime('230', true)).toBe('00:00:02.30');
    expect(maskTime('2300000', true)).toBe('02:30:00.00');
  });

  it('drops the trailing digit on a backspace, shifting the rest right', () => {
    expect(maskTime('02:30:00.0', true)).toBe('00:23:00.00');
  });

  it('regenerates separators the user deleted', () => {
    expect(maskTime('013000', false)).toBe('01:30:00');
    expect(maskTime('01300000', true)).toBe('01:30:00.00');
  });

  it('ignores non-digits, so typing a letter leaves the value alone', () => {
    expect(maskTime('01:00:00.00abc', true)).toBe('01:00:00.00');
    expect(maskTime('not a time', true)).toBe('00:00:00.00');
  });

  it('omits centiseconds when milliseconds are hidden', () => {
    expect(maskTime('13000', false)).toBe('01:30:00');
  });

  it('pads hours to two digits and grows them past that', () => {
    expect(maskTime('100000000', true)).toBe('100:00:00.00');
    expect(maskTime('9999000000', true)).toBe('9999:00:00.00');
  });

  it('stops accepting digits once the hours field is full', () => {
    expect(maskTime('99990000005', true)).toBe('9999:00:00.00');
  });

  it('renders an empty entry as zero rather than nothing', () => {
    expect(maskTime('', true)).toBe('00:00:00.00');
    expect(maskTime('', false)).toBe('00:00:00');
  });

  it('shifts digits through a zeroed field instead of growing the hours', () => {
    // Regression: the seeded 00:00:00 carried six digits, so each keystroke
    // pushed the value left and the hours field grew — 0000:30:03.
    expect(maskTime('00:00:003', false)).toBe('00:00:03');
    expect(maskTime('00:00:030', false)).toBe('00:00:30');
    expect(maskTime('00:00:300', false)).toBe('00:03:00');
    expect(maskTime('00:03:003', false)).toBe('00:30:03');
  });

  it('keeps the hours field at two digits until it genuinely overflows', () => {
    expect(maskTime('00:00:00.0003', true)).toBe('00:00:00.03');
    expect(maskTime('000000', false)).toBe('00:00:00');
  });

  it('leaves out-of-range segments alone for parseTime to reject', () => {
    expect(maskTime('9999', true)).toBe('00:00:99.99');
  });
});
