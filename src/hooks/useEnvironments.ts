import { useState, useEffect } from 'react';
import type { EnvironmentConfig } from '../types';

interface UseEnvironmentsReturn {
  environments: EnvironmentConfig[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

// In a real app with a backend, this would fetch from an API
// For a frontend-only app, we import the configs directly
export function useEnvironments(): UseEnvironmentsReturn {
  const [environments, setEnvironments] = useState<EnvironmentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnvironments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import all JSON files from config/environments
      // For Vite, we use import.meta.glob
      const modules = import.meta.glob('/config/environments/*.json', { eager: true });

      const configs: EnvironmentConfig[] = [];
      for (const path in modules) {
        const module = modules[path] as { default: EnvironmentConfig };
        configs.push(module.default);
      }

      if (configs.length === 0) {
        setError('No environment configurations found. Add JSON files to config/environments/');
      }

      setEnvironments(configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEnvironments();
  }, []);

  return {
    environments,
    isLoading,
    error,
    reload: loadEnvironments,
  };
}
