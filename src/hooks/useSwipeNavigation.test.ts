import { describe, it, expect, vi } from 'vitest';
import { shouldIgnoreTouch } from './useSwipeNavigation';
import { navigationStack } from '../services/navigationStack';

function createMockElement(
  tagName: string,
  attrs: Record<string, string> = {},
  parent: any = null
) {
  const el = {
    tagName: tagName.toUpperCase(),
    type: attrs.type || '',
    parentElement: parent,
    getAttribute: (attr: string) => attrs[attr] ?? null,
    hasAttribute: (attr: string) => attr in attrs,
  };
  return el as unknown as Element;
}

describe('useSwipeNavigation & navigationStack', () => {
  describe('shouldIgnoreTouch', () => {
    it('returns false for null or undefined targets', () => {
      expect(shouldIgnoreTouch(null)).toBe(false);
      expect(shouldIgnoreTouch(undefined as any)).toBe(false);
    });

    it('returns false for ordinary divs, cards, spans, and text', () => {
      const div = createMockElement('div');
      const span = createMockElement('span', {}, div);

      expect(shouldIgnoreTouch(span)).toBe(false);
      expect(shouldIgnoreTouch(div)).toBe(false);
    });

    it('returns false for text inputs, buttons, and textareas so swipe works anywhere', () => {
      const input = createMockElement('input', { type: 'text' });
      const numberInput = createMockElement('input', { type: 'number' });
      const button = createMockElement('button');
      const textarea = createMockElement('textarea');

      expect(shouldIgnoreTouch(input)).toBe(false);
      expect(shouldIgnoreTouch(numberInput)).toBe(false);
      expect(shouldIgnoreTouch(button)).toBe(false);
      expect(shouldIgnoreTouch(textarea)).toBe(false);
    });

    it('returns false for buttons and icons inside buttons', () => {
      const button = createMockElement('button');
      const icon = createMockElement('svg', {}, button);
      const path = createMockElement('path', {}, icon);

      expect(shouldIgnoreTouch(path)).toBe(false);
      expect(shouldIgnoreTouch(icon)).toBe(false);
      expect(shouldIgnoreTouch(button)).toBe(false);
    });

    it('returns true only for range sliders or explicit data-no-swipe', () => {
      const range = createMockElement('input', { type: 'range' });
      const noSwipe = createMockElement('div', { 'data-no-swipe': 'true' });
      const childOfNoSwipe = createMockElement('div', {}, noSwipe);

      expect(shouldIgnoreTouch(range)).toBe(true);
      expect(shouldIgnoreTouch(childOfNoSwipe)).toBe(true);
    });
  });

  describe('navigationStack', () => {
    it('pushes and pops handlers in LIFO order', () => {
      navigationStack.clear();

      const action1 = vi.fn();
      const action2 = vi.fn();

      navigationStack.push('level1', action1);
      navigationStack.push('level2', action2);

      expect(navigationStack.getDepth()).toBe(2);
      expect(navigationStack.hasEntries()).toBe(true);

      // Pop level 2
      const handled2 = navigationStack.popAndExecute();
      expect(handled2).toBe(true);
      expect(action2).toHaveBeenCalledTimes(1);
      expect(action1).not.toHaveBeenCalled();
      expect(navigationStack.getDepth()).toBe(1);

      // Pop level 1
      const handled1 = navigationStack.popAndExecute();
      expect(handled1).toBe(true);
      expect(action1).toHaveBeenCalledTimes(1);
      expect(navigationStack.getDepth()).toBe(0);

      // Pop empty
      const handledEmpty = navigationStack.popAndExecute();
      expect(handledEmpty).toBe(false);
    });

    it('removes a handler by ID when unmounted', () => {
      navigationStack.clear();

      const actionA = vi.fn();
      const actionB = vi.fn();

      navigationStack.push('itemA', actionA);
      navigationStack.push('itemB', actionB);

      navigationStack.remove('itemB');
      expect(navigationStack.getDepth()).toBe(1);

      navigationStack.popAndExecute();
      expect(actionA).toHaveBeenCalledTimes(1);
      expect(actionB).not.toHaveBeenCalled();
    });

    it('correctly handles History -> Transaction Details -> back to History -> back to Home', () => {
      navigationStack.clear();

      const goToHome = vi.fn();
      const closeTransactionDetails = vi.fn();

      // 1. User navigates to History tab (currentTab !== 'home')
      navigationStack.push('main-tab-subpage', goToHome);
      expect(navigationStack.getDepth()).toBe(1);

      // 2. User taps transaction to open Transaction Details
      navigationStack.push('transaction-detail-modal', closeTransactionDetails);
      expect(navigationStack.getDepth()).toBe(2);

      // 3. User performs Android edge-back gesture or presses back button
      // EXPECTED: Transaction Details closes, History remains visible
      const backResult1 = navigationStack.popAndExecute();
      expect(backResult1).toBe(true);
      expect(closeTransactionDetails).toHaveBeenCalledTimes(1);
      expect(goToHome).not.toHaveBeenCalled();
      expect(navigationStack.getDepth()).toBe(1);
      expect(navigationStack.hasEntries()).toBe(true);

      // 4. User performs Android back gesture again
      // EXPECTED: Navigates from History to Home
      const backResult2 = navigationStack.popAndExecute();
      expect(backResult2).toBe(true);
      expect(goToHome).toHaveBeenCalledTimes(1);
      expect(navigationStack.getDepth()).toBe(0);
      expect(navigationStack.hasEntries()).toBe(false);

      // 5. User performs Android back gesture again from Home
      // EXPECTED: System allowed to exit app (no internal interception)
      const backResult3 = navigationStack.popAndExecute();
      expect(backResult3).toBe(false);
    });
  });
});
