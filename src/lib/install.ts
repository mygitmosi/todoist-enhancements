/**
 * Putting the app on a phone's home screen (#273).
 *
 * A web app that opens full screen, without the browser's bar, is one
 * "Add to Home Screen" away, and nothing on a phone says so. This keeps what
 * the invitation needs to decide whether to appear: how many times the app has
 * been opened on this device, whether it was put away for later, and which way
 * in this browser has (Safari's Share menu, or Chrome's install prompt).
 *
 * It stays on the device and is never sent anywhere, like everything else here.
 */

/** Chrome's install prompt, which the type library does not know yet. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallWay = 'ios' | 'prompt';

const VISITS = 'installPrompt.visits';
const SNOOZED = 'installPrompt.snoozedUntil';
const DONE = 'installPrompt.done';
const COUNTED = 'installPrompt.counted';
/** "Later" hides the invitation for this long. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** The invitation waits for this many openings: not before the app has been seen once. */
const VISITS_BEFORE = 2;

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const read = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* storage may be blocked: the invitation just asks again */ }
};

/** Listens from the first moment: Chrome fires its event once, early. */
export function watchInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    write(DONE, '1');
    notify();
  });
}

export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Opened from the home screen already: nothing to offer. */
export function isInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

const isIos = (): boolean => {
  const ua = navigator.userAgent;
  // An iPad asks for the desktop site and says it is a Mac: touch is what gives it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

/** Which way in this browser has, if any. */
export function installWay(): InstallWay | null {
  if (isInstalled()) return null;
  if (deferred) return 'prompt';
  return isIos() ? 'ios' : null;
}

/** Counts this opening, once per browser session. */
export function countVisit(): void {
  try {
    if (sessionStorage.getItem(COUNTED)) return;
    sessionStorage.setItem(COUNTED, '1');
  } catch { /* a blocked store counts every render: harmless, it only asks sooner */ }
  write(VISITS, String((Number(read(VISITS)) || 0) + 1));
}

/**
 * Whether to ask now. `localStorage.installPrompt = 'force'`, or `?install` on the
 * address (which a phone can type), asks every time, for trying the invitation
 * out without waiting for a second visit.
 */
export function shouldOffer(): boolean {
  if (!installWay()) return false;
  if (read('installPrompt') === 'force' || new URLSearchParams(window.location.search).has('install')) return true;
  if (read(DONE) === '1') return false;
  if (Date.now() < (Number(read(SNOOZED)) || 0)) return false;
  return (Number(read(VISITS)) || 0) >= VISITS_BEFORE;
}

export const snoozeInstall = (): void => write(SNOOZED, String(Date.now() + SNOOZE_MS));
export const finishInstall = (): void => write(DONE, '1');

/** Chrome's own dialog; true once the app was installed. */
export async function installNow(): Promise<boolean> {
  if (!deferred) return false;
  const asked = deferred;
  deferred = null;
  await asked.prompt();
  const { outcome } = await asked.userChoice;
  if (outcome === 'accepted') finishInstall();
  notify();
  return outcome === 'accepted';
}
