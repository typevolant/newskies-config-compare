import { useState } from 'react';
import type { EnvironmentConfig, AuthState } from '../types';
import type { SnapshotProgress } from '../types/snapshot';
import { useSnapshotGenerator } from '../hooks/useSnapshotGenerator';

interface SnapshotGeneratorProps {
  environments: EnvironmentConfig[];
  authStates: Map<string, AuthState>;
  tokens: Map<string, string>;
  onLoginClick: (env: EnvironmentConfig) => void;
}

export function SnapshotGenerator({
  environments,
  authStates,
  tokens,
  onLoginClick,
}: SnapshotGeneratorProps) {
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentConfig | null>(null);
  const { progress, isGenerating, generateSnapshot, cancelGeneration } = useSnapshotGenerator();

  const handleGenerate = async () => {
    if (!selectedEnv) return;

    const token = tokens.get(selectedEnv.name);
    const authState = authStates.get(selectedEnv.name);

    if (!token || !authState?.isAuthenticated) {
      alert('Please log in to the selected environment first');
      return;
    }

    // Get username from auth state or use 'unknown'
    const username = authState.roleCode || 'unknown';

    await generateSnapshot(selectedEnv, token, username);
  };

  const authState = selectedEnv ? authStates.get(selectedEnv.name) : null;
  const isAuthenticated = authState?.isAuthenticated;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        {/* Environment Selection */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Environment
          </label>
          <select
            value={selectedEnv?.name || ''}
            onChange={(e) => {
              const env = environments.find((env) => env.name === e.target.value);
              setSelectedEnv(env || null);
            }}
            disabled={isGenerating}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Choose an environment...</option>
            {environments.map((env) => (
              <option key={env.name} value={env.name}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        {/* Auth Status / Login Button */}
        {selectedEnv && !isAuthenticated && (
          <button
            onClick={() => onLoginClick(selectedEnv)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Login
          </button>
        )}

        {/* Generate Button */}
        {selectedEnv && isAuthenticated && !isGenerating && (
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Generate Snapshot
          </button>
        )}

        {/* Cancel Button */}
        {isGenerating && (
          <button
            onClick={cancelGeneration}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Auth Status Indicator */}
      {selectedEnv && (
        <div className="text-sm">
          {isAuthenticated ? (
            <span className="text-green-600">Authenticated</span>
          ) : (
            <span className="text-amber-600">Login required to generate snapshot</span>
          )}
        </div>
      )}

      {/* Progress Display */}
      {isGenerating && <ProgressDisplay progress={progress} />}

      {/* Completion/Error Messages */}
      {progress.phase === 'complete' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
          <p>
            Snapshot saved to{' '}
            <code className="bg-green-100 px-1 rounded">{progress.savedPath}</code>
          </p>
          <p className="mt-2">
            <button
              onClick={() => window.location.reload()}
              className="text-green-700 underline hover:text-green-900"
            >
              Reload the page
            </button>{' '}
            to see the new snapshot in the comparison list.
          </p>
        </div>
      )}

      {progress.phase === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          Error: {progress.errorMessage}
        </div>
      )}

      {/* Info */}
      {selectedEnv && !isGenerating && progress.phase === 'idle' && (
        <div className="text-sm text-gray-500">
          This will fetch roles from the API, then fetch {14} environment-wide endpoints
          and {18} role-based endpoints for each role.
        </div>
      )}
    </div>
  );
}

function ProgressDisplay({ progress }: { progress: SnapshotProgress }) {
  if (progress.phase === 'fetching-roles') {
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Fetching roles from API...</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '50%' }} />
        </div>
      </div>
    );
  }

  if (progress.phase === 'saving') {
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Saving snapshot...</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '90%' }} />
        </div>
      </div>
    );
  }

  if (progress.phase === 'environment') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Fetching environment settings...</span>
          <span>
            {progress.currentEndpointIndex}/{progress.totalEndpoints}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${((progress.currentEndpointIndex || 0) / (progress.totalEndpoints || 1)) * 100}%`,
            }}
          />
        </div>
        <div className="text-sm text-gray-500">{progress.currentEndpoint}</div>
      </div>
    );
  }

  if (progress.phase === 'roles') {
    const roleProgress = ((progress.currentRoleIndex || 0) - 1) / (progress.totalRoles || 1);
    const endpointProgress = (progress.currentEndpointIndex || 0) / (progress.totalEndpoints || 1);
    const totalProgress = (roleProgress + endpointProgress / (progress.totalRoles || 1)) * 100;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Fetching role: <strong>{progress.currentRole}</strong>
          </span>
          <span>
            Role {progress.currentRoleIndex}/{progress.totalRoles}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
        <div className="text-sm text-gray-500">
          Endpoint {progress.currentEndpointIndex}/{progress.totalEndpoints}
        </div>
      </div>
    );
  }

  return null;
}
