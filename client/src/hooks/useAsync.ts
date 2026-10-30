import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

/** Runs an abortable loader whenever deps change. Returns data, error, loading and a reload function. */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    loaderRef
      .current(ctrl.signal)
      .then((result) => {
        if (!ctrl.signal.aborted) setData(result);
      })
      .catch((err: Error) => {
        if (!ctrl.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, setData, error, loading, reload };
}
