export type BackAction = () => void;

interface StackItem {
  id: string;
  onBack: BackAction;
}

let stack: StackItem[] = [];
let isPoppingProgrammatically = false;

export const navigationStack = {
  push(id: string, onBack: BackAction) {
    // Prevent duplicate registration of the same ID
    stack = stack.filter(item => item.id !== id);
    stack.push({ id, onBack });

    try {
      if (typeof window !== 'undefined') {
        window.history.pushState({ financeOsNav: id, depth: stack.length }, '');
      }
    } catch {
      // ignore
    }
  },

  remove(id: string) {
    const idx = stack.findIndex(item => item.id === id);
    if (idx !== -1) {
      const isTop = idx === stack.length - 1;
      stack.splice(idx, 1);

      // If top item was closed programmatically (via UI click/tap), pop the corresponding history state
      if (isTop && typeof window !== 'undefined') {
        try {
          isPoppingProgrammatically = true;
          window.history.back();
          setTimeout(() => {
            isPoppingProgrammatically = false;
          }, 150);
        } catch {
          isPoppingProgrammatically = false;
        }
      }
    }
  },

  popAndExecute(): boolean {
    if (stack.length === 0) return false;
    const item = stack.pop();
    if (item) {
      item.onBack();
      return true;
    }
    return false;
  },

  getDepth(): number {
    return stack.length;
  },

  hasEntries(): boolean {
    return stack.length > 0;
  },

  clear() {
    stack = [];
  }
};

// Global popstate listener for Android hardware/system gesture back
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (isPoppingProgrammatically) {
      isPoppingProgrammatically = false;
      return;
    }

    if (navigationStack.hasEntries()) {
      navigationStack.popAndExecute();
    }
  });
}
