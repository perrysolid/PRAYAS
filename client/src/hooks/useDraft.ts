import { useEffect, useState } from "react";

/**
 * Keeps an unsent form in this browser so a dropped connection in the hills
 * does not cost the citizen what they typed. Cleared on successful submit.
 */
export function useDraft<T extends object>(key: string, initial: T) {
  const storageKey = `cmh1905.draft.${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? { ...initial, ...JSON.parse(saved) } : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Draft just won't survive a reload.
    }
  }, [storageKey, value]);

  const clear = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // nothing to clear
    }
  };

  return [value, setValue, clear] as const;
}
