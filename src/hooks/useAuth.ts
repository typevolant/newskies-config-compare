import { useState, useCallback, useEffect, useRef } from 'react';
import type { AuthState, Credentials, TokenResponse } from '../types';

const REFRESH_BUFFER_MS = 60000; // Refresh 1 minute before expiration

interface UseAuthReturn extends AuthState {
  login: (baseUrl: string, credentials: Credentials) => Promise<boolean>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    token: null,
    expires: null,
    isAuthenticated: false,
    isExpired: false,
    roleCode: null,
    error: null,
  });

  const refreshTimeoutRef = useRef<number | null>(null);
  const baseUrlRef = useRef<string | null>(null);

  // Clear any pending refresh timeout
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Schedule token refresh
  const scheduleRefresh = useCallback((token: string, expires: Date, baseUrl: string) => {
    clearRefreshTimeout();

    const now = new Date();
    const msUntilExpiry = expires.getTime() - now.getTime();
    const msUntilRefresh = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 1000);

    refreshTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/auth/v1/token`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data: TokenResponse = await response.json();
        const newExpires = new Date(data.data.expires);

        setState(prev => ({
          ...prev,
          token: data.data.token,
          expires: newExpires,
          isExpired: false,
          error: null,
        }));

        // Schedule next refresh
        scheduleRefresh(data.data.token, newExpires, baseUrl);
      } catch {
        setState(prev => ({
          ...prev,
          isExpired: true,
          isAuthenticated: false,
          error: 'Token refresh failed. Please log in again.',
        }));
      }
    }, msUntilRefresh);
  }, [clearRefreshTimeout]);

  // Login function
  const login = useCallback(async (baseUrl: string, credentials: Credentials): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));
    baseUrlRef.current = baseUrl;

    try {
      const response = await fetch(`${baseUrl}/api/auth/v1/token/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Login failed with status ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      const expires = new Date(data.data.expires);

      setState({
        token: data.data.token,
        expires,
        isAuthenticated: true,
        isExpired: false,
        roleCode: data.data.roleCode,
        error: null,
      });

      // Schedule auto-refresh
      scheduleRefresh(data.data.token, expires, baseUrl);

      return true;
    } catch (err) {
      setState({
        token: null,
        expires: null,
        isAuthenticated: false,
        isExpired: false,
        roleCode: null,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      return false;
    }
  }, [scheduleRefresh]);

  // Logout function
  const logout = useCallback(() => {
    clearRefreshTimeout();
    baseUrlRef.current = null;
    setState({
      token: null,
      expires: null,
      isAuthenticated: false,
      isExpired: false,
      roleCode: null,
      error: null,
    });
  }, [clearRefreshTimeout]);

  // Check for expiration on interval
  useEffect(() => {
    const checkExpiration = () => {
      if (state.expires && state.isAuthenticated) {
        const now = new Date();
        if (now >= state.expires) {
          setState(prev => ({
            ...prev,
            isExpired: true,
            isAuthenticated: false,
            error: 'Session expired. Please log in again.',
          }));
          clearRefreshTimeout();
        }
      }
    };

    const interval = setInterval(checkExpiration, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [state.expires, state.isAuthenticated, clearRefreshTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRefreshTimeout();
    };
  }, [clearRefreshTimeout]);

  return {
    ...state,
    login,
    logout,
  };
}
