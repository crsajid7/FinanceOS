import { useEffect, useRef } from 'react';
import { navigationStack, BackAction } from '../services/navigationStack';

/**
 * Registers an in-app back handler on the navigation stack whenever active is true.
 * Handles Android system back gesture, browser back button, and touch edge back.
 */
export function useBackHandler(id: string, active: boolean, onBack: BackAction) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;

    navigationStack.push(id, () => {
      onBackRef.current();
    });

    return () => {
      navigationStack.remove(id);
    };
  }, [id, active]);
}
