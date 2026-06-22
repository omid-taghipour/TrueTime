/** True when a modal dialog (e.g. the keyboard shortcuts help) is open, so global hotkeys shouldn't fire underneath it. */
export function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null;
}
