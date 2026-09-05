import { useEffect, useRef } from 'react';

export interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;  // Finger moved RIGHT -> LEFT: NEXT page / tab
  onSwipeRight?: () => void; // Finger moved LEFT -> RIGHT: PREVIOUS page / tab
  disabled?: boolean;
  threshold?: number;       // Minimum horizontal distance in px, default 50
  targetRef?: React.RefObject<HTMLElement | null>; // Container element; if omitted, attaches to window
}

/**
 * Checks if touch event should be ignored (e.g. range slider or explicit data-no-swipe)
 */
export function shouldIgnoreTouch(target: EventTarget | null): boolean {
  if (!target || typeof (target as any).tagName !== 'string') return false;

  let el: any = target;
  while (el && (typeof document === 'undefined' || (el !== document.body && el !== document.documentElement))) {
    const tagName = typeof el.tagName === 'string' ? el.tagName.toLowerCase() : '';

    if (
      (tagName === 'input' && el.type === 'range') ||
      (typeof el.hasAttribute === 'function' && el.hasAttribute('data-no-swipe'))
    ) {
      return true;
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
 * - Works anywhere on screen (inputs, buttons, cards, text, background)
 * - Vertical scroll gestures (deltaY dominant) are safely ignored
 * - Taps and button clicks continue to work normally
 * - Once swipe triggers, subsequent synthetic click is swallowed
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  threshold = 50,
  targetRef,
}: UseSwipeNavigationOptions) {
  const onSwipeLeftRef = useRef(onSwipeLeft);
  onSwipeLeftRef.current = onSwipeLeft;

  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeRightRef.current = onSwipeRight;

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isIgnoredRef = useRef(false);
  const isVerticalScrollRef = useRef(false);
  const hasTriggeredRef = useRef(false);
  const swipeJustTriggeredRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const targetElement = targetRef ? targetRef.current : window;
    if (!targetElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        isIgnoredRef.current = true;
        return;
      }

      if (shouldIgnoreTouch(e.target)) {
        isIgnoredRef.current = true;
        return;
      }

      isIgnoredRef.current = false;
      isVerticalScrollRef.current = false;
      hasTriggeredRef.current = false;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isIgnoredRef.current || hasTriggeredRef.current || isVerticalScrollRef.current || e.touches.length !== 1) {
        return;
      }

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startXRef.current;
      const deltaY = currentY - startYRef.current;

      // Vertical scroll protection:
      // If finger moved vertically by > 20px and vertical movement is greater than horizontal,
      // it's a vertical scroll. Lock out swipe navigation for this gesture.
      if (Math.abs(deltaY) > 20 && Math.abs(deltaY) >= Math.abs(deltaX)) {
        isVerticalScrollRef.current = true;
        return;
      }

      // Horizontal swipe detection:
      // Dominates vertical movement and exceeds threshold
      if (Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        hasTriggeredRef.current = true;
        swipeJustTriggeredRef.current = true;

        // Dismiss keyboard / blur active element on intentional swipe
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        if (deltaX < 0) {
          // Swipe right to left -> NEXT
          onSwipeLeftRef.current?.();
        } else {
          // Swipe left to right -> PREVIOUS
          onSwipeRightRef.current?.();
        }

        setTimeout(() => {
          swipeJustTriggeredRef.current = false;
        }, 200);
      }
    };

    const handleTouchEnd = () => {
      isIgnoredRef.current = false;
      isVerticalScrollRef.current = false;
      hasTriggeredRef.current = false;
      setTimeout(() => {
        swipeJustTriggeredRef.current = false;
      }, 100);
    };

    const handleCaptureClick = (e: MouseEvent) => {
      if (swipeJustTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        swipeJustTriggeredRef.current = false;
      }
    };

    targetElement.addEventListener('touchstart', handleTouchStart as EventListener, { capture: true, passive: true });
    targetElement.addEventListener('touchmove', handleTouchMove as EventListener, { capture: true, passive: true });
    targetElement.addEventListener('touchend', handleTouchEnd as EventListener, { capture: true, passive: true });
    targetElement.addEventListener('touchcancel', handleTouchEnd as EventListener, { capture: true, passive: true });
    targetElement.addEventListener('click', handleCaptureClick as EventListener, { capture: true });

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart as EventListener, { capture: true });
      targetElement.removeEventListener('touchmove', handleTouchMove as EventListener, { capture: true });
      targetElement.removeEventListener('touchend', handleTouchEnd as EventListener, { capture: true });
      targetElement.removeEventListener('touchcancel', handleTouchEnd as EventListener, { capture: true });
      targetElement.removeEventListener('click', handleCaptureClick as EventListener, { capture: true });
    };
  }, [disabled, threshold, targetRef?.current]);
}
