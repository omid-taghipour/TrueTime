import { describe, expect, it } from 'vitest';
import { isTypingTarget } from './isTypingTarget';

describe('isTypingTarget', () => {
  it('is true for input, textarea, and select elements', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(document.createElement('select'))).toBe(true);
  });

  it('is true for contenteditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isTypingTarget(div)).toBe(true);
  });

  it('is false for buttons, plain divs, and non-element targets', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(document.createElement('div'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
