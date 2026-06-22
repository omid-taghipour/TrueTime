/** True when a keydown's target is a text field, so global hotkeys shouldn't fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const editable = target.getAttribute('contenteditable');
  return editable === 'true' || editable === '';
}
