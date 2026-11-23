import { apiRequest } from './apiClient';
import type { HealthStatusResponse } from '../types';

/**
 * Health check API service
 */
export const healthService = {
  /**
   * Fetches service health status from backend GET /api/health
   */
  async checkHealth(): Promise<HealthStatusResponse> {
    return apiRequest<HealthStatusResponse>('/api/health', {
      method: 'GET',
    });
  },
};
