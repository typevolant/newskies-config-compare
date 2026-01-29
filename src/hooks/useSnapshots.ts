import { useState, useEffect, useCallback } from 'react';
import type { EnvironmentSnapshot, SnapshotMetadata } from '../types/snapshot';

interface UseSnapshotsReturn {
  snapshots: Map<string, SnapshotMetadata[]>; // environment name -> snapshots
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  loadSnapshot: (filename: string) => Promise<EnvironmentSnapshot | null>;
}

// Parse filename to extract timestamp (format: 2024-01-23T15-30-00.json)
function parseFilename(path: string): { environment: string; timestamp: string; filename: string } | null {
  // Path format: /history/envName/2024-01-23T15-30-00.json
  const match = path.match(/\/history\/([^/]+)\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.json$/);
  if (!match) return null;

  const [, environment, timestampStr] = match;
  // Convert filename timestamp to ISO format
  const timestamp = timestampStr.replace(/-(\d{2})-(\d{2})$/, ':$1:$2') + 'Z';

  return {
    environment,
    timestamp,
    filename: path,
  };
}

export function useSnapshots(): UseSnapshotsReturn {
  const [snapshots, setSnapshots] = useState<Map<string, SnapshotMetadata[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for loaded snapshot data
  const [snapshotCache] = useState<Map<string, EnvironmentSnapshot>>(new Map());

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use Vite's import.meta.glob to discover snapshot files (lazy, not bundled)
      const modules = import.meta.glob('/history/**/*.json');

      const snapshotMap = new Map<string, SnapshotMetadata[]>();

      // Load minimal metadata from each file (in parallel, but lazily)
      const loadPromises = Object.keys(modules).map(async (path) => {
        const parsed = parseFilename(path);
        if (!parsed) return null;

        try {
          // Load just enough to get metadata
          const module = await modules[path]() as { default: EnvironmentSnapshot };
          const snapshot = module.default;

          // Cache the full snapshot data
          snapshotCache.set(path, snapshot);

          return {
            environment: parsed.environment,
            timestamp: snapshot.timestamp || parsed.timestamp,
            filename: path,
            generatedBy: snapshot.generatedBy || 'unknown',
          } as SnapshotMetadata;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(loadPromises);

      for (const metadata of results) {
        if (!metadata) continue;
        const existing = snapshotMap.get(metadata.environment) || [];
        existing.push(metadata);
        snapshotMap.set(metadata.environment, existing);
      }

      // Sort snapshots by timestamp (newest first)
      snapshotMap.forEach((list) => {
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });

      setSnapshots(snapshotMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots');
    } finally {
      setIsLoading(false);
    }
  }, [snapshotCache]);

  const loadSnapshot = useCallback(async (filename: string): Promise<EnvironmentSnapshot | null> => {
    // Check cache first
    const cached = snapshotCache.get(filename);
    if (cached) return cached;

    // If not in cache, try to load it
    try {
      const modules = import.meta.glob('/history/**/*.json');
      const loader = modules[filename];
      if (!loader) return null;

      const module = await loader() as { default: EnvironmentSnapshot };
      snapshotCache.set(filename, module.default);
      return module.default;
    } catch {
      return null;
    }
  }, [snapshotCache]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  return {
    snapshots,
    isLoading,
    error,
    reload: loadSnapshots,
    loadSnapshot,
  };
}
