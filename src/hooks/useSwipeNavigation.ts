import { useEffect, useRef } from 'react';
import { navigationStack } from '../services/navigationStack';

export interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;  // Finger moved RIGHT -> LEFT: NEXT page / tab
  onSwipeRight?: () => void; // Finger moved LEFT -> RIGHT: PREVIOUS page / tab
  onEdgeBack?: () => void;   // Edge swipe LEFT -> RIGHT or RIGHT -> LEFT (e.g. close modal)
  disabled?: boolean;
  threshold?: number;       // Minimum horizontal distance in px, default 50
  edgeThreshold?: number;   // Distance from physical screen edge in px, default 30
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
 * - Edge swipe (within edgeThreshold from screen edge): BACK
 *   - Closes topmost modal/detail view without switching tabs
 *   - Left edge -> swipe right (deltaX >= 40): BACK
 *   - Right edge -> swipe left (deltaX <= -40): BACK
 * - Content swipe (outside edgeThreshold):
 *   - Swipe right -> left (deltaX < 0): NEXT page/tab
 *   - Swipe left -> right (deltaX > 0): PREVIOUS page/tab
 * - Works anywhere on screen (inputs, buttons, cards, text, background)
 * - Vertical scroll gestures (deltaY dominant) are safely ignored
 * - Taps and button clicks continue to work normally
 * - Once swipe triggers, subsequent synthetic click is swallowed
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  onEdgeBack,
  disabled = false,
  threshold = 50,
  edgeThreshold = 30,
  targetRef,
}: UseSwipeNavigationOptions) {
  const onSwipeLeftRef = useRef(onSwipeLeft);
  onSwipeLeftRef.current = onSwipeLeft;

  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeRightRef.current = onSwipeRight;

  const onEdgeBackRef = useRef(onEdgeBack);
  onEdgeBackRef.current = onEdgeBack;

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isEdgeStartRef = useRef(false);
  const edgeSideRef = useRef<'left' | 'right' | null>(null);
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

      const isLeft = startXRef.current <= edgeThreshold;
      const isRight = typeof window !== 'undefined' && startXRef.current >= window.innerWidth - edgeThreshold;
      isEdgeStartRef.current = isLeft || isRight;
      edgeSideRef.current = isLeft ? 'left' : isRight ? 'right' : null;
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
      // it's a vertical scroll gesture. Suppress swipe navigation for this gesture.
      if (Math.abs(deltaY) > 20 && Math.abs(deltaY) >= Math.abs(deltaX)) {
        isVerticalScrollRef.current = true;
        return;
      }

      // 1. Edge-Back Gesture:
      // Starts within edgeThreshold of physical screen edge
      if (isEdgeStartRef.current) {
        const isBackSwipe =
          (edgeSideRef.current === 'left' && deltaX >= 40 && deltaX > Math.abs(deltaY) * 1.2) ||
          (edgeSideRef.current === 'right' && deltaX <= -40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2);

        if (isBackSwipe) {
          hasTriggeredRef.current = true;
          swipeJustTriggeredRef.current = true;

          // Dismiss keyboard/blur active element
          if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          // Trigger edge back action (or pop navigation stack)
          if (onEdgeBackRef.current) {
            onEdgeBackRef.current();
          } else if (navigationStack.hasEntries()) {
            navigationStack.popAndExecute();
          }

          setTimeout(() => {
            swipeJustTriggeredRef.current = false;
          }, 200);
          return;
        }
      }

      // 2. Normal Horizontal Content Swipe:
      // Dominates vertical movement and exceeds threshold
      if (!isEdgeStartRef.current && Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        hasTriggeredRef.current = true;
        swipeJustTriggeredRef.current = true;

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
      isEdgeStartRef.current = false;
      edgeSideRef.current = null;
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
  }, [disabled, threshold, edgeThreshold, targetRef?.current]);
}
