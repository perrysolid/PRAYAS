import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import type { Meta } from "../lib/types";

type MetaState = {
  meta: Meta | null;
  error: Error | null;
  department: (id: string) => Meta["departments"][number] | undefined;
  district: (id: string) => Meta["districts"][number] | undefined;
};

const MetaContext = createContext<MetaState | null>(null);

/** Departments, districts and escalation levels, loaded once and shared by every page. */
export function MetaProvider({ children }: { children: ReactNode }) {
  const { data: meta, error } = useAsync((signal) => api.meta(signal), []);
  const value = useMemo<MetaState>(
    () => ({
      meta: meta ?? null,
      error,
      department: (id) => meta?.departments.find((d) => d.id === id),
      district: (id) => meta?.districts.find((d) => d.id === id),
    }),
    [meta, error],
  );
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error("useMeta must be used inside MetaProvider");
  return ctx;
}
