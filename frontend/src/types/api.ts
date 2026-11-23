/**
 * Health check response schema matching backend GET /api/health
 */
export interface HealthStatusResponse {
  status: string;
  app: string;
}

/**
 * Generic API result state representation
 */
export type ConnectionState = 'idle' | 'checking' | 'connected' | 'error';

export interface HealthCheckState {
  state: ConnectionState;
  data: HealthStatusResponse | null;
  error: string | null;
  lastChecked: string | null;
  latencyMs: number | null;
}
