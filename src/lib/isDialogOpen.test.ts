import { afterEach, describe, expect, it } from 'vitest';
import { isDialogOpen } from './isDialogOpen';

describe('isDialogOpen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is false when nothing with role="dialog" is in the document', () => {
    expect(isDialogOpen()).toBe(false);
  });

  it('is true when a role="dialog" element is in the document', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    expect(isDialogOpen()).toBe(true);
  });
});
