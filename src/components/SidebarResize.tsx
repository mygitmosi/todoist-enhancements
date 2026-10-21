import { useEffect, useRef, useState } from 'react';
import { useIsPhone } from '@/hooks/useTouchLayout';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';

const KEY = 'enhanced-sidebar-width';
export const sidebarWidth = (value: number, viewport: number) => Math.max(236, Math.min(value, 520, viewport * 0.45));

/** Device-local width, also clamped when the window becomes narrower. */
export function SidebarResize({ hidden }: { hidden: boolean }) {
  const { t } = useT();
  const phone = useIsPhone();
  const layout = useStore((s) => s.prefs.layout);
  const defaultWidth = layout === 'sidebar-float' ? 268 : 248;
  const [width, setWidth] = useState<number | null>(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      return Number.isFinite(saved) && saved >= 236 ? saved : null;
    } catch { return null; }
  });
  const [viewport, setViewport] = useState(window.innerWidth);
  const held = useRef<{ x: number; width: number } | null>(null);
  const actual = sidebarWidth(width ?? defaultWidth, viewport);
  useEffect(() => {
    const resize = () => setViewport(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (phone || width === null) document.documentElement.style.removeProperty('--sidebar-w');
    else document.documentElement.style.setProperty('--sidebar-w', `${actual}px`);
    return () => { document.documentElement.style.removeProperty('--sidebar-w'); };
  }, [actual, phone, width]);
  const change = (next: number) => {
    const value = sidebarWidth(next, window.innerWidth);
    setWidth(value);
    try { localStorage.setItem(KEY, String(value)); } catch { /* Device storage can be blocked. */ }
  };
  if (phone || hidden) return null;
  return <div className="sidebar-resize" role="separator" tabIndex={0}
    aria-label={t('nav.resizeSidebar')} aria-orientation="vertical"
    aria-valuemin={236} aria-valuemax={Math.floor(Math.min(520, viewport * 0.45))} aria-valuenow={Math.round(actual)}
    onDoubleClick={() => {
      setWidth(null);
      try { localStorage.removeItem(KEY); } catch { /* Device storage can be blocked. */ }
    }}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      held.current = { x: event.clientX, width: actual };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => { if (held.current) change(held.current.width + event.clientX - held.current.x); }}
    onPointerUp={(event) => { held.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
    onLostPointerCapture={() => { held.current = null; }}
    onPointerCancel={() => { held.current = null; }}
    onKeyDown={(event) => {
      const next = event.key === 'Home' ? 236 : event.key === 'End' ? 520
        : event.key === 'ArrowLeft' ? actual - (event.shiftKey ? 40 : 10)
        : event.key === 'ArrowRight' ? actual + (event.shiftKey ? 40 : 10) : null;
      if (next !== null) { event.preventDefault(); event.stopPropagation(); change(next); }
    }} />;
}
