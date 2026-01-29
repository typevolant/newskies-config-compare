// Environment configuration stored in config/environments/*.json
export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
}

export interface Role {
  roleCode: string;
  name: string;
  parentRoleCode: string | null;
}

// Authentication
export interface Credentials {
  username: string;
  password: string;
  domain: string;
}

export interface TokenResponse {
  data: {
    token: string;
    expires: string;
    roleCode: string;
    domainCode: string;
    organizationCode: string;
    cultureCode: string;
    currencyCode: string;
    locationCode: string;
    userKey: string;
    personKey: string;
    multiFactorRequired: null | unknown;
  };
}

export interface AuthState {
  token: string | null;
  expires: Date | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  roleCode: string | null;
  error: string | null;
}

// Settings
export interface SettingsEndpoint {
  path: string;
  name: string;
  category: string;
  roleRequired: boolean;
}

export interface SettingsData {
  [endpointPath: string]: unknown;
}

// Diff types
export type DiffType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffResult {
  path: string;
  type: DiffType;
  leftValue?: unknown;
  rightValue?: unknown;
}

export type DiffViewMode = 'side-by-side' | 'unified';

// Re-export snapshot types
export type {
  EnvironmentSnapshot,
  SnapshotMetadata,
  ComparisonSource,
  SnapshotProgress,
} from './snapshot';
