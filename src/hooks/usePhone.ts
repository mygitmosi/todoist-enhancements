import { useSyncExternalStore } from 'react';

/** The same width the stylesheets call a phone (mobile.css and the rules before it). */
const PHONE = '(max-width: 720px)';

const subscribe = (notify: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};

/** Whether the window is a phone's width, kept up to date as it turns or resizes. */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false);
}
