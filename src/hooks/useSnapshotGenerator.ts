import { useState, useCallback } from 'react';
import type { EnvironmentConfig, Role } from '../types';
import type { EnvironmentSnapshot, SnapshotProgress } from '../types/snapshot';
import { ROLE_BASED_ENDPOINTS, ENVIRONMENT_ENDPOINTS } from '../utils/endpoints';

interface RolesResponse {
  data: Role[];
}

interface UseSnapshotGeneratorReturn {
  progress: SnapshotProgress;
  isGenerating: boolean;
  generateSnapshot: (
    environment: EnvironmentConfig,
    token: string,
    username: string
  ) => Promise<EnvironmentSnapshot | null>;
  cancelGeneration: () => void;
}

export function useSnapshotGenerator(): UseSnapshotGeneratorReturn {
  const [progress, setProgress] = useState<SnapshotProgress>({ phase: 'idle' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const generateSnapshot = useCallback(async (
    environment: EnvironmentConfig,
    token: string,
    username: string
  ): Promise<EnvironmentSnapshot | null> => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);

    try {
      // Phase 0: Fetch roles from API
      setProgress({ phase: 'fetching-roles' });

      const rolesResponse = await fetch(`${environment.baseUrl}/api/nsk/v2/resources/roles`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!rolesResponse.ok) {
        throw new Error(`Failed to fetch roles: HTTP ${rolesResponse.status}`);
      }

      const rolesData: RolesResponse = await rolesResponse.json();
      const roles = rolesData.data;

      if (!roles || roles.length === 0) {
        throw new Error('No roles returned from API');
      }

      const snapshot: EnvironmentSnapshot = {
        environment: environment.name,
        baseUrl: environment.baseUrl,
        timestamp: new Date().toISOString(),
        generatedBy: username,
        roles,
        environmentSettings: {},
        roleSettings: {},
      };

      // Phase 1: Fetch environment-wide settings
      setProgress({
        phase: 'environment',
        currentEndpointIndex: 0,
        totalEndpoints: ENVIRONMENT_ENDPOINTS.length,
      });

      for (let i = 0; i < ENVIRONMENT_ENDPOINTS.length; i++) {
        if (controller.signal.aborted) throw new Error('Cancelled');

        const endpoint = ENVIRONMENT_ENDPOINTS[i];
        setProgress({
          phase: 'environment',
          currentEndpoint: endpoint.name,
          currentEndpointIndex: i + 1,
          totalEndpoints: ENVIRONMENT_ENDPOINTS.length,
        });

        try {
          const response = await fetch(`${environment.baseUrl}${endpoint.path}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal,
          });

          if (response.ok) {
            snapshot.environmentSettings[endpoint.path] = await response.json();
          } else {
            snapshot.environmentSettings[endpoint.path] = {
              _error: `HTTP ${response.status}`,
            };
          }
        } catch (err) {
          if (controller.signal.aborted) throw new Error('Cancelled');
          snapshot.environmentSettings[endpoint.path] = {
            _error: err instanceof Error ? err.message : 'Fetch failed',
          };
        }
      }

      // Phase 2: Fetch role-based settings for each role
      const totalRoles = roles.length;

      for (let roleIndex = 0; roleIndex < totalRoles; roleIndex++) {
        if (controller.signal.aborted) throw new Error('Cancelled');

        const role = roles[roleIndex];
        snapshot.roleSettings[role.roleCode] = {};

        setProgress({
          phase: 'roles',
          currentRole: role.name,
          currentRoleIndex: roleIndex + 1,
          totalRoles,
          currentEndpointIndex: 0,
          totalEndpoints: ROLE_BASED_ENDPOINTS.length,
        });

        // Fetch all role-based endpoints with concurrency limit
        const queue = [...ROLE_BASED_ENDPOINTS];
        const concurrency = 6;
        let endpointsDone = 0;

        const fetchEndpoint = async () => {
          while (queue.length > 0) {
            if (controller.signal.aborted) return;

            const endpoint = queue.shift();
            if (!endpoint) break;

            try {
              const url = `${environment.baseUrl}${endpoint.path}?RoleCode=${encodeURIComponent(role.roleCode)}`;
              const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal,
              });

              if (response.ok) {
                snapshot.roleSettings[role.roleCode][endpoint.path] = await response.json();
              } else {
                snapshot.roleSettings[role.roleCode][endpoint.path] = {
                  _error: `HTTP ${response.status}`,
                };
              }
            } catch (err) {
              if (controller.signal.aborted) return;
              snapshot.roleSettings[role.roleCode][endpoint.path] = {
                _error: err instanceof Error ? err.message : 'Fetch failed',
              };
            }

            endpointsDone++;
            setProgress({
              phase: 'roles',
              currentRole: role.name,
              currentRoleIndex: roleIndex + 1,
              totalRoles,
              currentEndpointIndex: endpointsDone,
              totalEndpoints: ROLE_BASED_ENDPOINTS.length,
            });
          }
        };

        // Run concurrent workers
        await Promise.all(Array(concurrency).fill(null).map(fetchEndpoint));
      }

      // Phase 3: Save snapshot to history folder
      setProgress({ phase: 'saving' });

      const filename = `history/${generateSnapshotFilename(snapshot.environment, snapshot.timestamp)}`;

      const saveResponse = await fetch('/api/save-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data: snapshot }),
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.error || 'Failed to save snapshot');
      }

      setProgress({ phase: 'complete', savedPath: filename });
      setIsGenerating(false);
      setAbortController(null);

      return snapshot;
    } catch (err) {
      if ((err as Error).message === 'Cancelled') {
        setProgress({ phase: 'idle' });
      } else {
        setProgress({
          phase: 'error',
          errorMessage: err instanceof Error ? err.message : 'Generation failed',
        });
      }
      setIsGenerating(false);
      setAbortController(null);
      return null;
    }
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  return {
    progress,
    isGenerating,
    generateSnapshot,
    cancelGeneration,
  };
}

// Helper to generate the filename for a snapshot
export function generateSnapshotFilename(environmentName: string, timestamp: string): string {
  // Convert ISO timestamp to filename-safe format
  const fileTimestamp = timestamp
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '')
    .replace('Z', '');
  return `${environmentName.toLowerCase()}/${fileTimestamp}.json`;
}

