import { useEffect } from 'react';
import { useStore } from '@/store/store';

/**
 * Picked rows that touch read as one block, as in Things (#106).
 *
 * Each picked row paints its own rounded tint, so a run of them was a stack of
 * pills with a notch at every seam. Whether two rows touch is a fact of the
 * page, not of the rows — a parent and its subtasks sit in different
 * wrappers, a heading or a drop line can come between — so it is read off the
 * screen: two picked rows one straight under the other in the same list are
 * joined, and each learns which of its ends is shared (`join-up`,
 * `join-down`). A board's cards stay separate cards.
 */
export function useSelectionBlocks(): void {
  const selection = useStore((s) => s.selection);

  useEffect(() => {
    let frame = 0;
    const mark = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rows = [...document.querySelectorAll<HTMLElement>('.screen.active .task')]
          .filter((row) => !row.closest('.col'));
        for (const row of rows) row.classList.remove('join-up', 'join-down');
        for (let at = 1; at < rows.length; at += 1) {
          const above = rows[at - 1];
          const below = rows[at];
          if (!above.classList.contains('picked') || !below.classList.contains('picked')) continue;
          if (above.closest('.group') !== below.closest('.group')) continue;
          const gap = below.getBoundingClientRect().top - above.getBoundingClientRect().bottom;
          if (Math.abs(gap) > 3) continue;
          above.classList.add('join-down');
          below.classList.add('join-up');
        }
      });
    };

    mark();
    // One picked row or none: nothing to join, and nothing to watch.
    if (selection.length < 2) return () => cancelAnimationFrame(frame);
    /* Rows come and go under a selection (a sync, a subtask opened, a page
       turned), and the marks have to follow them. */
    const app = document.querySelector('.app') ?? document.body;
    const observer = new MutationObserver(mark);
    observer.observe(app, { childList: true, subtree: true });
    window.addEventListener('resize', mark);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', mark);
    };
  }, [selection]);
}
