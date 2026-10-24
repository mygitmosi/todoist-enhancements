import { registerSW } from 'virtual:pwa-register';
import { useStore } from '@/store/store';
import { translate } from '@/i18n';

/** How often an open app asks whether a new version was deployed. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Takes a new version as soon as it is ready (#330).
 *
 * The worker already installs a new build in the background and takes over
 * at once (skipWaiting, clientsClaim), but nothing reloaded the page, so the
 * open app kept running the old code and a reload made before the download
 * ended still got it: it took several. Now the page reloads itself the moment
 * the new worker is in control, and asks for an update when it comes back to
 * the foreground. A reload never interrupts writing: with a field being typed
 * in or a window open, a "Reload" toast waits for the person instead.
 */
export function watchAppUpdate(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  let offered = false;
  /* Hands over to the waiting build, and reloads once it is in control. The
     plugin's own reload did not fire for a worker found by a later update
     check, so the page listens for the change of controller itself. */
  const takeNewVersion = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    void update(false);
  };
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!busy()) { takeNewVersion(); return; }
      if (offered) return;
      offered = true;
      const { toast, prefs } = useStore.getState();
      toast(translate(prefs.locale, 'update.ready'), undefined, {
        sticky: true,
        action: { label: translate(prefs.locale, 'update.reload'), run: takeNewVersion },
      });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => { if (navigator.onLine) void registration.update().catch(() => undefined); };
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    },
  });
}

/** Something the person is in the middle of, that a reload would throw away. */
function busy(): boolean {
  const active = document.activeElement as HTMLElement | null;
  const typing = !!active && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName));
  return typing || document.querySelector('.overlay, .composerbox') !== null;
}
