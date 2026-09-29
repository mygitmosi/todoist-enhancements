import { beforeEach, describe, expect, it } from 'vitest';
import { isTopOverlay, overlayCount, pushOverlay, removeOverlay } from './overlayStack';

beforeEach(() => {
  while (overlayCount() > 0) {
    removeOverlay('panel');
    removeOverlay('confirm');
    removeOverlay('search');
  }
});

describe('the dialogs in front of one another (#125)', () => {
  it('gives the keyboard to the last one opened, and only to it', () => {
    pushOverlay('panel');
    expect(isTopOverlay('panel')).toBe(true);

    pushOverlay('confirm');
    expect(isTopOverlay('confirm')).toBe(true);
    expect(isTopOverlay('panel')).toBe(false);
    expect(overlayCount()).toBe(2);
  });

  it('hands the keyboard back when the one in front closes', () => {
    pushOverlay('panel');
    pushOverlay('confirm');
    removeOverlay('confirm');
    expect(isTopOverlay('panel')).toBe(true);
    expect(overlayCount()).toBe(1);
  });

  it('keeps the order when one behind closes first', () => {
    pushOverlay('panel');
    pushOverlay('search');
    removeOverlay('panel');
    expect(isTopOverlay('search')).toBe(true);
    expect(overlayCount()).toBe(1);
  });

  it('puts a dialog that closes and opens again back in front', () => {
    pushOverlay('panel');
    pushOverlay('confirm');
    removeOverlay('panel');
    pushOverlay('panel');
    expect(isTopOverlay('panel')).toBe(true);
    expect(isTopOverlay('confirm')).toBe(false);
  });

  it('knows nothing about a dialog that is not open', () => {
    expect(isTopOverlay('ghost')).toBe(false);
    removeOverlay('ghost');
    expect(overlayCount()).toBe(0);
  });
});
