import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Credentials } from '../types';

interface AuthFormProps {
  onSubmit: (credentials: Credentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function AuthForm({ onSubmit, isLoading, error }: AuthFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate domain is exactly 3 characters
    if (domain.length !== 3) {
      setValidationError('Domain code must be exactly 3 characters');
      return;
    }

    await onSubmit({ username, password, domain: domain.toUpperCase() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || validationError) && (
        <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {validationError || error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
          Domain Code (3 characters)
        </label>
        <input
          type="text"
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value.slice(0, 3).toUpperCase())}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 uppercase"
          maxLength={3}
          required
          disabled={isLoading}
          placeholder="ABC"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
