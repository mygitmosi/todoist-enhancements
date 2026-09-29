/**
 * Session storage that can be missing.
 *
 * A browser that blocks site data for this address (Chrome's "Don't allow sites
 * to save data", some privacy extensions, some in-app webviews) makes merely
 * reading `window.sessionStorage` throw a `SecurityError`. The rest of the app
 * already copes with blocked storage; the few unwrapped session reads did not,
 * and one of them ran at launch, so the app sat on "Loading…" for ever (#128).
 * Everything that touches session storage goes through here instead.
 */

/** The stored value, or null when there is none or storage is not available. */
export function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Whether the value was stored. False when storage is blocked or full. */
export function sessionSet(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function sessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing was stored, so there is nothing to take out.
  }
}
