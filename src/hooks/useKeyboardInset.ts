import { useEffect } from 'react';

/**
 * Keeps `--kb` at the height of the on-screen keyboard while `active`, so a
 * sheet can sit on top of it (#294).
 *
 * A phone's keyboard shrinks the visible window and not the layout: a sheet
 * fixed to the bottom of the page ends up behind it, with its button. The
 * visual viewport is the part still showing; what lies below it is the
 * keyboard. `--sheet-inset` is the home-indicator room a sheet keeps at its
 * foot, which the keyboard has already covered when it is up.
 */
export function useKeyboardInset(active: boolean): void {
  useEffect(() => {
    const view = window.visualViewport;
    const root = document.documentElement;
    if (!active || !view) return;
    const sync = () => {
      const covered = Math.max(0, Math.round(window.innerHeight - view.height - view.offsetTop));
      root.style.setProperty('--kb', `${covered}px`);
      root.style.setProperty('--sheet-inset', covered > 80 ? '0px' : 'env(safe-area-inset-bottom)');
    };
    sync();
    view.addEventListener('resize', sync);
    view.addEventListener('scroll', sync);
    return () => {
      view.removeEventListener('resize', sync);
      view.removeEventListener('scroll', sync);
      root.style.removeProperty('--kb');
      root.style.removeProperty('--sheet-inset');
    };
  }, [active]);
}
