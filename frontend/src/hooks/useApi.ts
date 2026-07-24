import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// Fetch-on-mount hook that hands every view a uniform loading / error / reload
// contract, so no page has to re-implement the three states (README §3).
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: !!url,
    error: null,
  });

  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<T>(url);
      setState({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.message ??
        "Failed to load data. Please try again.";
      setState({ data: null, loading: false, error: String(message) });
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
