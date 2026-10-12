import { useEffect, useState, useReducer } from 'react';

/** Bridges the Api*Repository cache pattern (async refresh() + sync
 * getAll()/findById()) into React: runs `refreshFn` on mount/deps change,
 * exposes {loading, error, refetch()}. Views still read the repository
 * cache directly on every render (e.g. bookingRepository.getAll()) — this
 * hook only tracks the async fetch lifecycle, not the data itself. */
export function useRepository(refreshFn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null });
  const [version, bump] = useReducer((v) => v + 1, 0);

  useEffect(() => {
    let cancelled = false;
    // Only blank the page into the full-page spinner on the very first
    // load. A refetch() after a save/delete/toggle previously did this too,
    // which shrank the page height for an instant and snapped the browser's
    // scroll position back to the top — keep the current list on screen
    // instead and just swap it once the refresh resolves.
    setState((s) => (version === 0 ? { loading: true, error: null } : s));
    Promise.resolve(refreshFn())
      .then(() => { if (!cancelled) setState({ loading: false, error: null }); })
      .catch((err) => { if (!cancelled) setState({ loading: false, error: err }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { ...state, refetch: () => bump() };
}
