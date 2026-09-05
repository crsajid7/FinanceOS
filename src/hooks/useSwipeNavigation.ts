import { useEffect, useRef } from 'react';

export interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;  // Finger moved RIGHT -> LEFT: NEXT page / tab
  onSwipeRight?: () => void; // Finger moved LEFT -> RIGHT: PREVIOUS page / tab
  disabled?: boolean;
  threshold?: number;       // Minimum horizontal distance in px, default 60
  targetRef?: React.RefObject<HTMLElement | null>; // Attach to specific container; if omitted, attaches to window
}

/**
 * Checks if touch event originated inside an interactive control
 * or a horizontally scrollable container.
 */
export function isInteractiveOrScrollable(target: EventTarget | null): boolean {
  if (!target || typeof (target as any).tagName !== 'string') return false;

  let el: any = target;
  while (el && (typeof document === 'undefined' || (el !== document.body && el !== document.documentElement))) {
    const tagName = typeof el.tagName === 'string' ? el.tagName.toLowerCase() : '';

    // 1. Interactive controls and form inputs
    if (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      tagName === 'button' ||
      tagName === 'a' ||
      (typeof el.getAttribute === 'function' && (
        el.getAttribute('role') === 'button' ||
        el.getAttribute('role') === 'slider' ||
        el.getAttribute('role') === 'tab' ||
        el.getAttribute('contenteditable') === 'true'
      )) ||
      (typeof el.hasAttribute === 'function' && el.hasAttribute('data-no-swipe'))
    ) {
      return true;
    }

    // 2. Horizontally scrollable elements (chips, tabs bar, horizontal carousels)
    try {
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          if (el.scrollWidth > el.clientWidth + 4) {
            return true;
          }
        }
      }
    } catch {
      // ignore
    }

    el = el.parentElement;
  }

  return false;
}

/**
 * Global & container-level swipe navigation hook.
 *
 * Rules:
 * - Swipe right -> left (deltaX < 0): NEXT
 * - Swipe left -> right (deltaX > 0): PREVIOUS
 * - Dominant horizontal movement required (ratio >= 1.5 vs vertical)
 * - Vertical scroll gestures (deltaY dominant) are safely ignored
 * - Interacting with inputs, buttons, or scrollable chips is protected
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  threshold = 60,
  targetRef,
}: UseSwipeNavigationOptions) {
  const onSwipeLeftRef = useRef(onSwipeLeft);
  onSwipeLeftRef.current = onSwipeLeft;

  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeRightRef.current = onSwipeRight;

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isIgnoredRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const targetElement = targetRef ? targetRef.current : window;
    if (!targetElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        isIgnoredRef.current = true;
        return;
      }

      if (isInteractiveOrScrollable(e.target)) {
        isIgnoredRef.current = true;
        return;
      }

      isIgnoredRef.current = false;
      hasTriggeredRef.current = false;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isIgnoredRef.current || hasTriggeredRef.current || e.touches.length !== 1) {
        return;
      }

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startXRef.current;
      const deltaY = currentY - startYRef.current;

      // Vertical scroll protection:
      // If finger moved vertically by > 20px and vertical movement is greater than horizontal,
      // it's a vertical scroll. Lock out swipe navigation for this touch.
      if (Math.abs(deltaY) > 20 && Math.abs(deltaY) >= Math.abs(deltaX)) {
        isIgnoredRef.current = true;
        return;
      }

      // Horizontal swipe detection:
      // Must exceed threshold and dominate vertical movement by at least 1.5x
      if (Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        hasTriggeredRef.current = true;

        if (deltaX < 0) {
          // Swipe right to left -> NEXT
          onSwipeLeftRef.current?.();
        } else {
          // Swipe left to right -> PREVIOUS
          onSwipeRightRef.current?.();
        }
      }
    };

    const handleTouchEnd = () => {
      isIgnoredRef.current = false;
      hasTriggeredRef.current = false;
    };

    targetElement.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    targetElement.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    targetElement.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    targetElement.addEventListener('touchcancel', handleTouchEnd as EventListener, { passive: true });

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart as EventListener);
      targetElement.removeEventListener('touchmove', handleTouchMove as EventListener);
      targetElement.removeEventListener('touchend', handleTouchEnd as EventListener);
      targetElement.removeEventListener('touchcancel', handleTouchEnd as EventListener);
    };
  }, [disabled, threshold, targetRef?.current]);
}
