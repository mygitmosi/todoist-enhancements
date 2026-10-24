/** Escape dismisses; it does not start keyboard navigation. */
export function startInputModality(): void {
  const root = document.documentElement;
  root.dataset.navigation = 'pointer';
  document.addEventListener('pointerdown', () => { root.dataset.navigation = 'pointer'; }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') root.dataset.navigation = 'pointer';
    else if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'j', 'k', 'J', 'K'].includes(event.key)
      && !event.metaKey && !event.ctrlKey && !event.altKey) root.dataset.navigation = 'keyboard';
  }, true);
}
