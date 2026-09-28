import { useEffect, useRef, type ReactNode } from 'react';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  /** A side sheet slides in from the right; a sheet sits in the middle. */
  variant?: 'sheet' | 'side';
  /** 'full' fills the window, for a sheet that stands in for a whole page. */
  size?: 'sm' | 'md' | 'search' | 'full';
  /**
   * Where the focus goes on close, asked at that moment; the element that
   * had it on open when this gives nothing. A task panel that has walked
   * down a list hands the keyboard to the last task shown (#104).
   */
  returnFocusTo?: () => HTMLElement | null;
}

/**
 * Something open in front of the dialog: a menu, a date picker, a select.
 *
 * Each closes itself on Escape, so while one is up the dialog behind it must
 * not take the same keystroke as meaning itself.
 */
const OPEN_INSIDE = '.popover, .datepanel, .fselect-list';

/** Everything in a dialog the keyboard can land on. */
const FOCUSABLE = [
  'a[href]', 'button', 'input', 'textarea', 'select',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * The shell every dialog shares: a scrim that closes on click, Escape to
 * dismiss, focus moved inside on open, kept inside while it is up, returned to
 * where it came from on close, and the page behind held still throughout.
 */
export function Overlay({
  open, onClose, children, label, variant = 'sheet', size = 'md', returnFocusTo,
}: OverlayProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  /* Escape has to reach whichever `onClose` is current, but the effect below
     must not be torn down and set up again merely because the caller passed a
     fresh arrow — and every caller passes a fresh arrow, on every render of
     the page behind the dialog. Setting it up again moved the focus back to
     the top of the sheet, which for someone typing a description or filling a
     column of estimates meant the caret left mid-word and the rest of the
     sentence landed in the first field. Hence the ref: the handler stays put,
     the callback it reads does not. */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const returnRef = useRef(returnFocusTo);
  returnRef.current = returnFocusTo;

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* Already answered by something inside the dialog — a field leaving
           itself, a picker closing. React stops the native event at its own
           root, which is usually enough; this is the part that does not
           depend on knowing that. */
        if (e.defaultPrevented) return;
        /* Escape closes the innermost thing that is open. A menu or a picker
           inside the dialog is in front of the dialog, so it answers first —
           otherwise pressing Escape to put a date picker away took the whole
           task panel with it, and the way back was to find the task again.
           The pickers draw themselves into the document rather than into the
           sheet, which is why this looks for them there. */
        if (document.querySelector(OPEN_INSIDE)) return;
        e.stopPropagation();
        closeRef.current();
        return;
      }

      /* Tab stays inside. A dialog is modal — the page behind it is held still
         and cannot be clicked — so tabbing out of it walked the keyboard
         through a sidebar there was no point reaching, and the only way back
         was to keep tabbing until it came round again. It comes round at the
         edges of the dialog instead. */
      if (e.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const stops = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (stops.length === 0) return;

      const first = stops[0];
      const last = stops[stops.length - 1];
      const on = document.activeElement as HTMLElement | null;
      /* Focus outside the dialog altogether — left behind on the page, or
         nowhere at all — comes back to the near end of it rather than carrying
         on from wherever it was. */
      if (!on || !sheet.contains(on)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (!e.shiftKey && on === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && on === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onKey);

    /* Move focus into the dialog so the keyboard follows the eye. A dialog
       that names its own starting point gets it: otherwise the first focusable
       thing wins, which in a sheet is the close button in its header. */
    const target =
      sheetRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      sheetRef.current?.querySelector<HTMLElement>(
        'input, textarea, button, [tabindex]:not([tabindex="-1"])',
      );
    target?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      (returnRef.current?.() ?? restoreTo.current)?.focus?.();
    };
    /* `open` and nothing else. See closeRef above. */
  }, [open]);

  if (!open) return null;

  const sheetClass =
    variant === 'side'
      ? 'side-sheet'
      : `sheet${
          size === 'sm' ? ' sheet-sm'
            : size === 'search' ? ' sheet-search'
              : size === 'full' ? ' sheet-full'
                : ''
        }`;

  return (
    <div className="overlay open" role="dialog" aria-modal="true" aria-label={label}>
      <div className="scrim" onClick={onClose} />
      <div className={sheetClass} ref={sheetRef}>
        {children}
      </div>
    </div>
  );
}
