import { useState, useCallback, useEffect } from 'react';
import { healthService } from '../services';
import type { HealthCheckState } from '../types';

export function useHealthCheck(autoCheck = true) {
  const [state, setState] = useState<HealthCheckState>({
    state: 'idle',
    data: null,
    error: null,
    lastChecked: null,
    latencyMs: null,
  });

  const checkConnection = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      state: 'checking',
      error: null,
    }));

    const startTime = performance.now();
    try {
      const data = await healthService.checkHealth();
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      setState({
        state: 'connected',
        data,
        error: null,
        lastChecked: new Date().toLocaleTimeString(),
        latencyMs,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach backend';
      setState({
        state: 'error',
        data: null,
        error: message,
        lastChecked: new Date().toLocaleTimeString(),
        latencyMs: null,
      });
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      checkConnection();
    }
  }, [autoCheck, checkConnection]);

  return {
    ...state,
    checkConnection,
    isLoading: state.state === 'checking',
    isConnected: state.state === 'connected',
  };
}
