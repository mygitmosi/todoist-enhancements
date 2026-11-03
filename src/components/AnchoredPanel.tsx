import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PanelSheet } from '@/components/SheetChrome';
import { usePhone } from '@/hooks/usePhone';

/**
 * A panel that hangs from the thing that opened it, and says so: a small
 * arrow points at that thing, which stays marked while the panel is open
 * (the caller marks it). On a phone it is the same sheet Display is.
 *
 * It is drawn in the page's top layer, positioned from the anchor's own
 * rectangle, so no row it sits in can cut it, and it opens upwards when
 * there is no room below.
 */
export function AnchoredPanel({ anchor, onClose, label, className = '', children }: {
  anchor: HTMLElement;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const phone = usePhone();
  const closing = useRef(onClose);
  closing.current = onClose;
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; arrow: number; side: 'below' | 'above'; room: number } | null>(null);

  const measure = () => {
    const el = box.current;
    if (!el) return;
    const at = anchor.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const gap = 12;
    const left = Math.max(8, Math.min(at.left, window.innerWidth - width - 8));
    const below = at.bottom + gap + height <= window.innerHeight - 8;
    /* Above only when it fits there and below it does not; otherwise below, scrolling. */
    const above = at.top - gap - height >= 8;
    const side = below || !above ? 'below' : 'above';
    const top = side === 'below' ? at.bottom + gap : Math.max(8, at.top - gap - height);
    const arrow = Math.max(22, Math.min(at.left + at.width / 2 - left, width - 22));
    /* What is left of the window on that side: a taller panel scrolls inside it, to its last line. */
    const room = Math.max(160, side === 'below' ? window.innerHeight - top - 12 : at.top - gap - 12);
    setPlace((now) => (now && now.top === top && now.left === left && now.arrow === arrow && now.side === side && now.room === room ? now : { top, left, arrow, side, room }));
  };

  useLayoutEffect(() => {
    if (phone) return;
    measure();
    const el = box.current;
    const watch = el ? new ResizeObserver(measure) : null;
    if (el) watch?.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { watch?.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measure only reads the anchor and the box.
  }, [anchor, phone]);

  useEffect(() => {
    const away = (event: MouseEvent) => {
      const target = event.target as Node;
      if (box.current?.contains(target) || anchor.contains(target)) return;
      /* A select's list is drawn outside the panel; it is still part of it. */
      if ((target as Element).closest?.('.fselect-list, .popover.listbox, .multiselect-options, .sidemenu')) return;
      closing.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('.fselect-list, .multiselect-options, .sidemenu')) return;
      event.stopPropagation();
      closing.current();
      anchor.focus();
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape, true); };
  }, [anchor]);

  if (phone) {
    return createPortal(
      <div className="displaywrap">
        <PanelSheet className={`popover displaypanel viewpanel ${className}`} label={label} onClose={() => closing.current()}>{children}</PanelSheet>
      </div>,
      document.body,
    );
  }
  return createPortal(
    <div
      ref={box}
      className={`anchored ${className}`}
      role="dialog"
      aria-label={label}
      data-side={place?.side ?? 'below'}
      style={{ top: place?.top ?? -9999, left: place?.left ?? 0, ['--arrow' as string]: `${place?.arrow ?? 30}px` }}
    >
      <span className="anchored-arrow" aria-hidden="true" />
      <div className="anchored-body" style={{ maxHeight: place?.room }}>{children}</div>
    </div>,
    document.body,
  );
}
