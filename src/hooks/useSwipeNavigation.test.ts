import { describe, it, expect } from 'vitest';
import { shouldIgnoreTouch } from './useSwipeNavigation';

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

describe('useSwipeNavigation', () => {
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
});
