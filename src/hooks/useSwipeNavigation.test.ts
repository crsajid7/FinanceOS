import { describe, it, expect } from 'vitest';
import { isInteractiveOrScrollable } from './useSwipeNavigation';

function createMockElement(
  tagName: string,
  attrs: Record<string, string> = {},
  parent: any = null,
  scrollWidth = 100,
  clientWidth = 100
) {
  const el = {
    tagName: tagName.toUpperCase(),
    parentElement: parent,
    scrollWidth,
    clientWidth,
    getAttribute: (attr: string) => attrs[attr] ?? null,
    hasAttribute: (attr: string) => attr in attrs,
  };
  return el as unknown as Element;
}

describe('useSwipeNavigation', () => {
  describe('isInteractiveOrScrollable', () => {
    it('returns false for null or undefined targets', () => {
      expect(isInteractiveOrScrollable(null)).toBe(false);
      expect(isInteractiveOrScrollable(undefined as any)).toBe(false);
    });

    it('returns false for ordinary divs and spans', () => {
      const div = createMockElement('div');
      const span = createMockElement('span', {}, div);

      expect(isInteractiveOrScrollable(span)).toBe(false);
      expect(isInteractiveOrScrollable(div)).toBe(false);
    });

    it('returns true for inputs, buttons, textareas, and selects', () => {
      const input = createMockElement('input');
      const button = createMockElement('button');
      const textarea = createMockElement('textarea');
      const select = createMockElement('select');

      expect(isInteractiveOrScrollable(input)).toBe(true);
      expect(isInteractiveOrScrollable(button)).toBe(true);
      expect(isInteractiveOrScrollable(textarea)).toBe(true);
      expect(isInteractiveOrScrollable(select)).toBe(true);
    });

    it('returns true for child elements inside a button', () => {
      const button = createMockElement('button');
      const icon = createMockElement('svg', {}, button);
      const path = createMockElement('path', {}, icon);

      expect(isInteractiveOrScrollable(path)).toBe(true);
      expect(isInteractiveOrScrollable(icon)).toBe(true);
    });

    it('returns true for elements with role button, slider, or tab', () => {
      const roleButton = createMockElement('div', { role: 'button' });
      const roleSlider = createMockElement('div', { role: 'slider' });
      const roleTab = createMockElement('div', { role: 'tab' });

      expect(isInteractiveOrScrollable(roleButton)).toBe(true);
      expect(isInteractiveOrScrollable(roleSlider)).toBe(true);
      expect(isInteractiveOrScrollable(roleTab)).toBe(true);
    });

    it('returns true for elements with data-no-swipe', () => {
      const parent = createMockElement('div', { 'data-no-swipe': 'true' });
      const child = createMockElement('div', {}, parent);

      expect(isInteractiveOrScrollable(child)).toBe(true);
    });
  });
});
