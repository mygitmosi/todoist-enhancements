import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionGet, sessionRemove, sessionSet } from './sessionStore';

afterEach(() => vi.unstubAllGlobals());

/** Session storage as a browser that blocks site data has it: touching it throws. */
function blocked() {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
  });
}

describe('session storage that is blocked (#128)', () => {
  it('reads as nothing, writes as not stored, and removes without complaint', () => {
    blocked();
    expect(sessionGet('demo')).toBeNull();
    expect(sessionSet('demo', '1')).toBe(false);
    expect(() => sessionRemove('demo')).not.toThrow();
  });
});

describe('session storage that works', () => {
  it('stores, reads and removes', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
    });
    expect(sessionSet('demo', '1')).toBe(true);
    expect(sessionGet('demo')).toBe('1');
    sessionRemove('demo');
    expect(sessionGet('demo')).toBeNull();
  });
});
