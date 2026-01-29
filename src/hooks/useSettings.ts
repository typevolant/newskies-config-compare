import { useState, useCallback } from 'react';
import type { SettingsData, SettingsEndpoint } from '../types';
import { buildEndpointUrl, ROLE_BASED_ENDPOINTS, ENVIRONMENT_ENDPOINTS } from '../utils/endpoints';

interface UseSettingsReturn {
  settings: SettingsData;
  isLoading: boolean;
  error: string | null;
  progress: { current: number; total: number };
  fetchAllSettings: (baseUrl: string, token: string, roleCode?: string) => Promise<SettingsData>;
  fetchSingleEndpoint: (baseUrl: string, token: string, endpoint: SettingsEndpoint, roleCode?: string) => Promise<unknown>;
  clearSettings: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchSingleEndpoint = useCallback(async (
    baseUrl: string,
    token: string,
    endpoint: SettingsEndpoint,
    roleCode?: string
  ): Promise<unknown> => {
    const url = buildEndpointUrl(baseUrl, endpoint, roleCode);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint.name}: ${response.status}`);
    }

    return response.json();
  }, []);

  const fetchAllSettings = useCallback(async (
    baseUrl: string,
    token: string,
    roleCode?: string
  ): Promise<SettingsData> => {
    setIsLoading(true);
    setError(null);

    const allEndpoints = roleCode
      ? [...ENVIRONMENT_ENDPOINTS, ...ROLE_BASED_ENDPOINTS]
      : ENVIRONMENT_ENDPOINTS;

    setProgress({ current: 0, total: allEndpoints.length });

    const results: SettingsData = {};
    const errors: string[] = [];

    for (let i = 0; i < allEndpoints.length; i++) {
      const endpoint = allEndpoints[i];
      setProgress({ current: i + 1, total: allEndpoints.length });

      try {
        // Skip role-based endpoints if no roleCode provided
        if (endpoint.roleRequired && !roleCode) {
          continue;
        }

        const data = await fetchSingleEndpoint(baseUrl, token, endpoint, roleCode);
        results[endpoint.path] = data;
      } catch (err) {
        errors.push(endpoint.name);
        results[endpoint.path] = { error: err instanceof Error ? err.message : 'Failed to fetch' };
      }
    }

    setSettings(results);
    setIsLoading(false);

    if (errors.length > 0) {
      setError(`Failed to fetch: ${errors.join(', ')}`);
    }

    return results;
  }, [fetchSingleEndpoint]);

  const clearSettings = useCallback(() => {
    setSettings({});
    setError(null);
    setProgress({ current: 0, total: 0 });
  }, []);

  return {
    settings,
    isLoading,
    error,
    progress,
    fetchAllSettings,
    fetchSingleEndpoint,
    clearSettings,
  };
}
