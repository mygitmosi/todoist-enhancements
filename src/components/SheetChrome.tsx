import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';

/**
 * The parts every bottom sheet shares on a phone (#293): the grip at the top
 * that follows a finger down, the scrim that closes it, and a "Done" at the
 * bottom. None of them is drawn on a wide screen, where the same markup is a
 * popover or a window (mobile.css).
 */

const SHEET = '.sheet, .side-sheet, .popover';

/** Follows a touch on the grip, and lets go past a third of the way or on a flick. */
function useGrip(onClose: () => void) {
  const start = useRef<{ y: number; t: number } | null>(null);
  const sheetOf = (el: HTMLElement) => el.closest<HTMLElement>(SHEET);

  return {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      // A mouse never gets here in practice: the grip is not drawn on a wide screen.
      if (e.pointerType === 'mouse') return;
      const sheet = sheetOf(e.currentTarget);
      if (!sheet) return;
      start.current = { y: e.clientY, t: performance.now() };
      // A finger keeps the drag when it leaves the grip; a pointer that is already gone has nothing to keep.
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the drag still follows the moves it hears */ }
      sheet.style.transition = 'none';
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const sheet = sheetOf(e.currentTarget);
      if (!start.current || !sheet) return;
      sheet.style.transform = `translateY(${Math.max(0, e.clientY - start.current.y)}px)`;
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const from = start.current;
      start.current = null;
      const sheet = sheetOf(e.currentTarget);
      if (!from || !sheet) return;
      const dy = e.clientY - from.y;
      const speed = dy / Math.max(1, performance.now() - from.t);
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > Math.min(140, sheet.offsetHeight / 3) || (speed > 0.6 && dy > 40)) onClose();
    },
  };
}

/** The grip, and the close button that sits beside it. */
export function SheetGrip({ onClose, close = true }: { onClose: () => void; close?: boolean }) {
  const { t } = useT();
  const grip = useGrip(onClose);
  return (
    <>
      <div className="sheet-grip" aria-hidden="true" {...grip} onPointerCancel={grip.onPointerUp} />
      {close && (
        <button type="button" className="iconbtn sheet-x" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      )}
    </>
  );
}

/** Behind a sheet that is not a dialog: touching it puts the sheet away. */
export function SheetScrim({ onClick }: { onClick: () => void }) {
  return <div className="sheet-scrim" aria-hidden="true" onClick={onClick} />;
}

/** The one button at the foot of a menu that is not a dialog. */
export function SheetDone({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="sheet-done">
      <button type="button" className="btn primary" onClick={onClose}>{t('common.done')}</button>
    </div>
  );
}

/**
 * A menu that hangs under its button on a wide screen and is a sheet on a
 * phone: Display, and the other menus that look like it (#293). Everything the
 * sheet needs on a phone is here, so each menu only says what is inside it.
 */
export function PanelSheet({ className, label, onClose, children }: {
  className: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <SheetScrim onClick={onClose} />
      <div className={className} role="dialog" aria-label={label}>
        <SheetGrip onClose={onClose} />
        {children}
        <SheetDone onClose={onClose} />
      </div>
    </>
  );
}
