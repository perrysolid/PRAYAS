import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readPref, writePref } from "../lib/prefs";

const SCALES = [0.9, 1, 1.15, 1.3] as const;

type A11y = {
  scaleIndex: number;
  canGrow: boolean;
  canShrink: boolean;
  grow: () => void;
  shrink: () => void;
  reset: () => void;
  highContrast: boolean;
  toggleContrast: () => void;
};

const A11yContext = createContext<A11y | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [scaleIndex, setScaleIndex] = useState(() => {
    const saved = Number(readPref("scale"));
    return Number.isInteger(saved) && saved >= 0 && saved < SCALES.length ? saved : 1;
  });
  const [highContrast, setHighContrast] = useState(() => readPref("contrast") === "high");

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(SCALES[scaleIndex]));
    writePref("scale", String(scaleIndex));
  }, [scaleIndex]);

  useEffect(() => {
    if (highContrast) document.documentElement.dataset.contrast = "high";
    else delete document.documentElement.dataset.contrast;
    writePref("contrast", highContrast ? "high" : "normal");
  }, [highContrast]);

  const value = useMemo<A11y>(
    () => ({
      scaleIndex,
      canGrow: scaleIndex < SCALES.length - 1,
      canShrink: scaleIndex > 0,
      grow: () => setScaleIndex((i) => Math.min(i + 1, SCALES.length - 1)),
      shrink: () => setScaleIndex((i) => Math.max(i - 1, 0)),
      reset: () => setScaleIndex(1),
      highContrast,
      toggleContrast: () => setHighContrast((v) => !v),
    }),
    [scaleIndex, highContrast],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used inside A11yProvider");
  return ctx;
}
