import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useEnvironments } from './hooks/useEnvironments';
import { useMultiEnvAuth } from './hooks/useMultiEnvAuth';
import { useSnapshots } from './hooks/useSnapshots';
import { AuthForm } from './components/AuthForm';
import { RoleSelector } from './components/RoleSelector';
import { SettingsTree } from './components/SettingsTree';
import { DiffViewer } from './components/DiffViewer';
import { SourceSelector } from './components/SourceSelector';
import { SnapshotGenerator } from './components/SnapshotGenerator';

// Lazy load DocsModal to reduce initial bundle size
const DocsModal = lazy(() => import('./components/docs/DocsModal').then(m => ({ default: m.DocsModal })));
import type { EnvironmentConfig, Credentials, SettingsEndpoint, Role, ComparisonSource } from './types';
import type { EnvironmentSnapshot } from './types/snapshot';
import { ALL_ENDPOINTS, ENVIRONMENT_ENDPOINTS } from './utils/endpoints';
import { computeDiff } from './utils/diff';

function App() {
  const { environments, isLoading: envsLoading, error: envsError } = useEnvironments();
  const { snapshots, isLoading: snapshotsLoading, loadSnapshot } = useSnapshots();

  // Auth state per environment (for snapshot generation)
  const { authStates, tokens, login } = useMultiEnvAuth();

  // Comparison source selection (Snapshots only)
  const [leftSource, setLeftSource] = useState<ComparisonSource | null>(null);
  const [rightSource, setRightSource] = useState<ComparisonSource | null>(null);

  // Loaded snapshot data
  const [leftSnapshot, setLeftSnapshot] = useState<EnvironmentSnapshot | null>(null);
  const [rightSnapshot, setRightSnapshot] = useState<EnvironmentSnapshot | null>(null);

  // Role and endpoint selection
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<SettingsEndpoint | null>(null);

  // Login modal state (for snapshot generation)
  const [loginEnv, setLoginEnv] = useState<EnvironmentConfig | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Settings state
  const [leftSettings, setLeftSettings] = useState<Record<string, unknown>>({});
  const [rightSettings, setRightSettings] = useState<Record<string, unknown>>({});
  const [isFetching, setIsFetching] = useState(false);

  // Snapshot generator visibility
  const [showSnapshotGenerator, setShowSnapshotGenerator] = useState(false);

  // Documentation modal state
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [initialDocFilename, setInitialDocFilename] = useState<string | undefined>(undefined);

  // Open docs modal to a specific file
  const handleOpenDocs = useCallback((filename: string) => {
    setInitialDocFilename(filename);
    setShowDocsModal(true);
  }, []);

  // Get combined roles from both loaded snapshots
  const combinedRoles = useMemo((): Role[] => {
    const roleMap = new Map<string, Role>();

    // Add roles from left snapshot
    if (leftSnapshot?.roles) {
      leftSnapshot.roles.forEach((r) => roleMap.set(r.roleCode, r));
    }

    // Add roles from right snapshot
    if (rightSnapshot?.roles) {
      rightSnapshot.roles.forEach((r) => roleMap.set(r.roleCode, r));
    }

    return Array.from(roleMap.values());
  }, [leftSnapshot, rightSnapshot]);

  // Get applicable endpoints
  const applicableEndpoints = useMemo(() => {
    return selectedRole ? ALL_ENDPOINTS : ENVIRONMENT_ENDPOINTS;
  }, [selectedRole]);

  // Handle login (for snapshot generation)
  const handleLogin = useCallback(
    async (credentials: Credentials) => {
      if (!loginEnv) return;

      setIsLoggingIn(true);
      setLoginError(null);

      const success = await login(loginEnv.name, loginEnv.baseUrl, credentials);

      if (success) {
        setLoginEnv(null);
      } else {
        const authState = authStates.get(loginEnv.name);
        setLoginError(authState?.error || 'Login failed');
      }

      setIsLoggingIn(false);
    },
    [loginEnv, login, authStates]
  );

  // Handle source changes - load snapshot data
  const handleLeftSourceChange = useCallback(async (source: ComparisonSource | null) => {
    setLeftSource(source);
    setLeftSnapshot(null);
    setLeftSettings({});

    if (source?.type === 'snapshot') {
      const snapshot = await loadSnapshot(source.snapshot.filename);
      setLeftSnapshot(snapshot);
    }
  }, [loadSnapshot]);

  const handleRightSourceChange = useCallback(async (source: ComparisonSource | null) => {
    setRightSource(source);
    setRightSnapshot(null);
    setRightSettings({});

    if (source?.type === 'snapshot') {
      const snapshot = await loadSnapshot(source.snapshot.filename);
      setRightSnapshot(snapshot);
    }
  }, [loadSnapshot]);

  // Check if we can compare (both snapshots loaded)
  const canCompare = useMemo(() => {
    return leftSnapshot !== null && rightSnapshot !== null;
  }, [leftSnapshot, rightSnapshot]);

  // Extract settings from a snapshot for a specific role
  const extractSnapshotSettings = useCallback(
    (snapshot: EnvironmentSnapshot, roleCode: string | null): Record<string, unknown> => {
      const results: Record<string, unknown> = {};

      // Add environment-wide settings
      for (const path of Object.keys(snapshot.environmentSettings)) {
        results[path] = snapshot.environmentSettings[path];
      }

      // Add role-based settings if a role is selected
      if (roleCode && snapshot.roleSettings[roleCode]) {
        for (const path of Object.keys(snapshot.roleSettings[roleCode])) {
          results[path] = snapshot.roleSettings[roleCode][path];
        }
      }

      return results;
    },
    []
  );

  // Load settings from both snapshots
  const handleFetchSettings = useCallback(async () => {
    if (!leftSnapshot || !rightSnapshot) return;

    setIsFetching(true);

    const leftResults = extractSnapshotSettings(leftSnapshot, selectedRole);
    const rightResults = extractSnapshotSettings(rightSnapshot, selectedRole);

    setLeftSettings(leftResults);
    setRightSettings(rightResults);
    setIsFetching(false);
  }, [leftSnapshot, rightSnapshot, selectedRole, extractSnapshotSettings]);

  // Check if endpoint has data
  const hasData = useCallback(
    (path: string) => {
      return path in leftSettings || path in rightSettings;
    },
    [leftSettings, rightSettings]
  );

  // Check if endpoint has diff
  const hasDiff = useCallback(
    (path: string) => {
      const left = leftSettings[path];
      const right = rightSettings[path];
      if (!left && !right) return false;
      return computeDiff(left, right).some((d) => d.type !== 'unchanged');
    },
    [leftSettings, rightSettings]
  );

  // Get labels for diff viewer
  const leftLabel = useMemo(() => {
    if (!leftSource) return 'Left';
    const date = new Date(leftSource.snapshot.timestamp).toLocaleString();
    return `${leftSource.snapshot.environment} @ ${date}`;
  }, [leftSource]);

  const rightLabel = useMemo(() => {
    if (!rightSource) return 'Right';
    const date = new Date(rightSource.snapshot.timestamp).toLocaleString();
    return `${rightSource.snapshot.environment} @ ${date}`;
  }, [rightSource]);

  if (envsLoading || snapshotsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (envsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Error loading environments</p>
          <p className="text-sm mt-2">{envsError}</p>
          <p className="text-sm mt-4 text-gray-500">
            Add environment JSON files to <code>config/environments/</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NewSkies config comparison tool</h1>
            <p className="text-sm text-gray-500">Compare setting changes over time and between different roles and environments</p>
          </div>
          <button
            onClick={() => {
              setInitialDocFilename(undefined);
              setShowDocsModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Documentation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Docs</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Snapshot Generator (Collapsible) */}
        <section className="bg-white rounded-lg shadow">
          <button
            onClick={() => setShowSnapshotGenerator(!showSnapshotGenerator)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-800">Generate Snapshot</h2>
            <span className="text-gray-400">{showSnapshotGenerator ? '−' : '+'}</span>
          </button>
          {showSnapshotGenerator && (
            <div className="px-6 pb-6">
              <SnapshotGenerator
                environments={environments}
                authStates={authStates}
                tokens={tokens}
                onLoginClick={setLoginEnv}
              />
            </div>
          )}
        </section>

        {/* Source Selection */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Compare Snapshots</h2>
          <div className="grid grid-cols-2 gap-6">
            <SourceSelector
              label="Left Snapshot"
              snapshots={snapshots}
              selectedSource={leftSource}
              onSourceChange={handleLeftSourceChange}
              disabled={isFetching}
            />
            <SourceSelector
              label="Right Snapshot"
              snapshots={snapshots}
              selectedSource={rightSource}
              onSourceChange={handleRightSourceChange}
              disabled={isFetching}
            />
          </div>
        </section>

        {/* Role Selection & Fetch */}
        {leftSource && rightSource && (
          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <RoleSelector
                  roles={combinedRoles}
                  selectedRole={selectedRole}
                  onSelectRole={setSelectedRole}
                  disabled={isFetching}
                />
              </div>
              <button
                onClick={handleFetchSettings}
                disabled={!canCompare || isFetching}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetching ? 'Loading...' : 'Compare'}
              </button>
            </div>
            {!canCompare && (
              <p className="text-sm text-amber-600 mt-2">
                Please select snapshots for both sides to compare.
              </p>
            )}
          </section>
        )}

        {/* Comparison View */}
        {Object.keys(leftSettings).length > 0 || Object.keys(rightSettings).length > 0 ? (
          <section className="bg-white rounded-lg shadow">
            <div className="grid grid-cols-4 divide-x divide-gray-200" style={{ height: '600px' }}>
              {/* Settings Tree */}
              <div className="col-span-1 p-4 overflow-auto">
                <h3 className="font-semibold text-gray-700 mb-3">Settings</h3>
                <SettingsTree
                  endpoints={applicableEndpoints}
                  selectedEndpoint={selectedEndpoint}
                  onSelectEndpoint={setSelectedEndpoint}
                  hasData={hasData}
                  hasDiff={hasDiff}
                  onOpenDocs={handleOpenDocs}
                />
              </div>

              {/* Diff Viewer */}
              <div className="col-span-3 overflow-hidden">
                {selectedEndpoint ? (
                  <DiffViewer
                    leftLabel={leftLabel}
                    rightLabel={rightLabel}
                    leftData={leftSettings[selectedEndpoint.path]}
                    rightData={rightSettings[selectedEndpoint.path]}
                    endpointPath={selectedEndpoint.path}
                    onOpenDocs={handleOpenDocs}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Select a setting from the tree to view differences
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {/* Login Modal (for snapshot generation) */}
      {loginEnv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Login to {loginEnv.name}</h2>
              <button
                onClick={() => setLoginEnv(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <AuthForm
              onSubmit={handleLogin}
              isLoading={isLoggingIn}
              error={loginError}
            />
          </div>
        </div>
      )}

      {/* Documentation Modal - Lazy loaded */}
      {showDocsModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">Loading documentation...</div>
          </div>
        }>
          <DocsModal
            isOpen={showDocsModal}
            onClose={() => setShowDocsModal(false)}
            initialDoc={initialDocFilename}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
