import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';

const IDLE = { status: 'idle', events: [], elapsed: 0, result: null, error: null };

/**
 * Starts a server job (register / check) and polls it, exposing the live stage events the pipeline emits.
 * `start(endpoint, formData)` resolves once the job has finished; the final state is also in the hook.
 */
export default function useJob() {
  const [state, setState] = useState(IDLE);
  const timer = useRef(null);
  const alive = useRef(true);
  const since = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);

  const reset = useCallback(() => { clearTimeout(timer.current); since.current = 0; setState(IDLE); }, []);

  const start = useCallback(async (endpoint, formData) => {
    clearTimeout(timer.current);
    since.current = 0;
    setState({ ...IDLE, status: 'running' });
    const { job_id: id } = await apiClient(endpoint, { method: 'POST', body: formData });
    return new Promise((resolve) => {
      const tick = async () => {
        if (!alive.current) return;
        try {
          const r = await apiClient(`/api/jobs/${id}?since=${since.current}`);
          since.current += r.events.length;
          if (!alive.current) return;
          setState((s) => ({ status: r.status, events: [...s.events, ...r.events], elapsed: r.elapsed, result: r.result, error: r.error }));
          if (r.status === 'running') timer.current = setTimeout(tick, 300);
          else resolve(r);
        } catch (err) {
          if (!alive.current) return;
          setState((s) => ({ ...s, status: 'error', error: { status: err.status || 0, detail: err.message } }));
          resolve(null);
        }
      };
      tick();
    });
  }, []);

  return { ...state, start, reset };
}
