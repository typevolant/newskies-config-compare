import { useState, useCallback, useEffect, useRef } from 'react';
import type { AuthState, Credentials, TokenResponse } from '../types';

const REFRESH_BUFFER_MS = 60000; // Refresh 1 minute before expiration

interface EnvAuth extends AuthState {
  baseUrl: string;
}

interface UseMultiEnvAuthReturn {
  authStates: Map<string, AuthState>;
  tokens: Map<string, string>;
  login: (envName: string, baseUrl: string, credentials: Credentials) => Promise<boolean>;
  logout: (envName: string) => void;
}

export function useMultiEnvAuth(): UseMultiEnvAuthReturn {
  const [authStates, setAuthStates] = useState<Map<string, EnvAuth>>(new Map());
  const refreshTimeoutsRef = useRef<Map<string, number>>(new Map());

  // Clear refresh timeout for an environment
  const clearRefreshTimeout = useCallback((envName: string) => {
    const timeoutId = refreshTimeoutsRef.current.get(envName);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      refreshTimeoutsRef.current.delete(envName);
    }
  }, []);

  // Schedule token refresh for an environment
  const scheduleRefresh = useCallback((envName: string, token: string, expires: Date, baseUrl: string) => {
    clearRefreshTimeout(envName);

    const now = new Date();
    const msUntilExpiry = expires.getTime() - now.getTime();
    const msUntilRefresh = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 1000);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/auth/v1/token`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.status}`);
        }

        const data: TokenResponse = await response.json();
        const newExpires = new Date(data.data.expires);

        setAuthStates(prev => {
          const next = new Map(prev);
          next.set(envName, {
            token: data.data.token,
            expires: newExpires,
            isAuthenticated: true,
            isExpired: false,
            roleCode: data.data.roleCode,
            error: null,
            baseUrl,
          });
          return next;
        });

        // Schedule next refresh
        scheduleRefresh(envName, data.data.token, newExpires, baseUrl);
      } catch {
        setAuthStates(prev => {
          const next = new Map(prev);
          const current = next.get(envName);
          if (current) {
            next.set(envName, {
              ...current,
              isExpired: true,
              isAuthenticated: false,
              error: 'Token refresh failed. Please log in again.',
            });
          }
          return next;
        });
      }
    }, msUntilRefresh);

    refreshTimeoutsRef.current.set(envName, timeoutId);
  }, [clearRefreshTimeout]);

  // Login to an environment
  const login = useCallback(async (envName: string, baseUrl: string, credentials: Credentials): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/api/auth/v1/token/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Login failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      const expires = new Date(data.data.expires);

      setAuthStates(prev => {
        const next = new Map(prev);
        next.set(envName, {
          token: data.data.token,
          expires,
          isAuthenticated: true,
          isExpired: false,
          roleCode: data.data.roleCode,
          error: null,
          baseUrl,
        });
        return next;
      });

      // Schedule auto-refresh
      scheduleRefresh(envName, data.data.token, expires, baseUrl);

      return true;
    } catch (err) {
      setAuthStates(prev => {
        const next = new Map(prev);
        next.set(envName, {
          token: null,
          expires: null,
          isAuthenticated: false,
          isExpired: false,
          roleCode: null,
          error: err instanceof Error ? err.message : 'Login failed',
          baseUrl,
        });
        return next;
      });
      return false;
    }
  }, [scheduleRefresh]);

  // Logout from an environment
  const logout = useCallback((envName: string) => {
    clearRefreshTimeout(envName);
    setAuthStates(prev => {
      const next = new Map(prev);
      next.delete(envName);
      return next;
    });
  }, [clearRefreshTimeout]);

  // Check for expiration periodically
  useEffect(() => {
    const checkExpiration = () => {
      setAuthStates(prev => {
        let changed = false;
        const next = new Map(prev);
        const now = new Date();

        for (const [envName, auth] of next) {
          if (auth.expires && auth.isAuthenticated && now >= auth.expires) {
            next.set(envName, {
              ...auth,
              isExpired: true,
              isAuthenticated: false,
              error: 'Session expired. Please log in again.',
            });
            clearRefreshTimeout(envName);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    };

    const interval = setInterval(checkExpiration, 10000);
    return () => clearInterval(interval);
  }, [clearRefreshTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    const timeouts = refreshTimeoutsRef.current;
    return () => {
      for (const envName of timeouts.keys()) {
        clearRefreshTimeout(envName);
      }
    };
  }, [clearRefreshTimeout]);

  // Extract tokens map for convenience
  const tokens = new Map<string, string>();
  for (const [envName, auth] of authStates) {
    if (auth.token) {
      tokens.set(envName, auth.token);
    }
  }

  // Return authStates without baseUrl for the public interface
  const publicAuthStates = new Map<string, AuthState>();
  for (const [envName, auth] of authStates) {
    publicAuthStates.set(envName, {
      token: auth.token,
      expires: auth.expires,
      isAuthenticated: auth.isAuthenticated,
      isExpired: auth.isExpired,
      roleCode: auth.roleCode,
      error: auth.error,
    });
  }

  return {
    authStates: publicAuthStates,
    tokens,
    login,
    logout,
  };
}
