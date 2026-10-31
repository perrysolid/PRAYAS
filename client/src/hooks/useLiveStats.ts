import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Stats } from "../lib/types";
import { useAsync } from "./useAsync";

export type Pulse = { id: string; key: number };

/**
 * Public statistics, refreshed every few seconds. Districts whose count of complaints went up
 * since the last refresh are returned as pulses, so the map can show new complaints as they arrive.
 */
export function useLiveStats(intervalMs = 5000) {
  const state = useAsync((signal) => api.stats(signal), []);
  const { setData } = state;
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const last = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    if (!state.data) return;
    const now = new Map(state.data.byDistrict.map((d) => [d.id, d.total]));
    const before = last.current;
    last.current = now;
    if (!before) return;
    const grown = state.data.byDistrict.filter((d) => d.total > (before.get(d.id) ?? d.total)).map((d) => ({ id: d.id, key: Date.now() + Math.random() }));
    if (!grown.length) return;
    setPulses((p) => [...p, ...grown]);
    const keys = new Set(grown.map((g) => g.key));
    window.setTimeout(() => setPulses((p) => p.filter((x) => !keys.has(x.key))), 6000);
  }, [state.data]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      api.stats().then((s: Stats) => setData(s), () => undefined);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, setData]);

  return { ...state, pulses };
}
