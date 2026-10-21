import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * When the app offers to be put on a home screen (#273): not before a second
 * visit, not once it is installed or done with, not during a week of "Later",
 * and only where the browser has a way to do it.
 */

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

interface Setup { ua?: string; standalone?: boolean; touch?: number; search?: string }

/** A fresh module and a fresh browser for each test: the module keeps what Chrome announced. */
async function load({ ua = IPHONE, standalone = false, touch = 5, search = '' }: Setup = {}) {
  vi.resetModules();
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const store = (map: Map<string, string>) => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  });
  vi.stubGlobal('localStorage', store(local));
  vi.stubGlobal('sessionStorage', store(session));
  vi.stubGlobal('navigator', { userAgent: ua, maxTouchPoints: touch, standalone });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
    location: { search },
    addEventListener: () => undefined,
  });
  return { install: await import('./install'), local, session };
}

describe('the invitation to install', () => {
  beforeEach(() => { vi.useRealTimers(); });

  it('waits for the second opening', async () => {
    const { install, session } = await load();
    install.countVisit();
    expect(install.shouldOffer()).toBe(false);
    session.clear();                       // a new browser session is a new opening
    install.countVisit();
    expect(install.shouldOffer()).toBe(true);
  });

  it('counts an opening once, however many times it is asked', async () => {
    const { install, local } = await load();
    install.countVisit(); install.countVisit(); install.countVisit();
    expect(local.get('installPrompt.visits')).toBe('1');
  });

  it('says nothing once it has been installed or opened from the home screen', async () => {
    const { install, local } = await load({ standalone: true });
    local.set('installPrompt.visits', '5');
    expect(install.installWay()).toBeNull();
    expect(install.shouldOffer()).toBe(false);
  });

  it('is final once "Got it" has been pressed', async () => {
    const { install, local } = await load();
    local.set('installPrompt.visits', '5');
    expect(install.shouldOffer()).toBe(true);
    install.finishInstall();
    expect(install.shouldOffer()).toBe(false);
  });

  it('is put away for a week by "Later", and comes back after', async () => {
    const { install, local } = await load();
    local.set('installPrompt.visits', '5');
    const now = Date.now();
    vi.useFakeTimers(); vi.setSystemTime(now);
    install.snoozeInstall();
    expect(install.shouldOffer()).toBe(false);
    vi.setSystemTime(now + 6 * 24 * 3600 * 1000);
    expect(install.shouldOffer()).toBe(false);
    vi.setSystemTime(now + 8 * 24 * 3600 * 1000);
    expect(install.shouldOffer()).toBe(true);
  });

  it('has no way to offer on a browser that cannot install, such as a desktop one', async () => {
    const { install, local } = await load({ ua: DESKTOP, touch: 0 });
    local.set('installPrompt.visits', '5');
    expect(install.installWay()).toBeNull();
    expect(install.shouldOffer()).toBe(false);
  });

  it('takes an iPad that asks for the desktop site for a touch device, which it is', async () => {
    const { install } = await load({ ua: DESKTOP, touch: 5 });
    expect(install.installWay()).toBe('ios');
  });

  it('can be asked for at once, to be tried: from storage or from the address', async () => {
    const stored = await load();
    stored.local.set('installPrompt', 'force');
    expect(stored.install.shouldOffer()).toBe(true);
    const typed = await load({ search: '?install' });
    expect(typed.install.shouldOffer()).toBe(true);
  });
});
