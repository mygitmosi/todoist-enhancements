/**
 * The dialogs that are open, in the order they were opened.
 *
 * Every open `Overlay` listens to the keyboard on `document`, and listeners on
 * the same node run in the order they were added: the OLDER dialog answers
 * first. With a confirmation opened over the task panel, one Escape closed the
 * confirmation and then the panel behind it, and Tab was moved by both in turn
 * so it always landed on Cancel (#125). Only the last one opened is in front,
 * so only it may answer; this is the list that says which.
 *
 * Plain functions on a plain array, so the rule is the same in a test as in a
 * browser.
 */
const stack: string[] = [];

/** A dialog has opened. It is now the one in front. */
export const pushOverlay = (id: string): void => { stack.push(id); };

/** A dialog has closed, wherever it stood in the order. */
export const removeOverlay = (id: string): void => {
  const at = stack.lastIndexOf(id);
  if (at >= 0) stack.splice(at, 1);
};

/** Whether this is the dialog in front, the only one the keyboard belongs to. */
export const isTopOverlay = (id: string): boolean => stack[stack.length - 1] === id;

/** How many dialogs are open. */
export const overlayCount = (): number => stack.length;
