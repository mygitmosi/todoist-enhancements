import type { ViewPrefs } from './types';

/**
 * The classes a page takes from its view's Display settings. Only a list
 * reads them: a board and a table keep the whole page, and a calendar its own
 * grid.
 */
export const pageClass = (view: ViewPrefs): string => [
  'page',
  view.mode === 'list' && view.fullWidth !== true && 'narrow',
].filter(Boolean).join(' ');
