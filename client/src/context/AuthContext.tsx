import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";

type Auth = {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .me(ctrl.signal)
      .then((r) => setSession(r.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, loading, setSession, logout }), [session, loading, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
