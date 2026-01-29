import type { Role } from './index';

// Snapshot file format for historical environment settings
export interface EnvironmentSnapshot {
  environment: string;
  baseUrl: string;
  timestamp: string; // ISO 8601 format
  generatedBy: string;
  roles: Role[]; // Roles fetched from /api/nsk/v2/resources/roles
  environmentSettings: Record<string, unknown>;
  roleSettings: Record<string, Record<string, unknown>>; // RoleCode -> EndpointPath -> Data
}

// Metadata about a loaded snapshot (without the full data)
export interface SnapshotMetadata {
  environment: string;
  timestamp: string;
  filename: string;
  generatedBy: string;
}

// Source for comparison - a historical snapshot
export type ComparisonSource = { type: 'snapshot'; snapshot: SnapshotMetadata };

// Progress state for snapshot generation
export interface SnapshotProgress {
  phase: 'idle' | 'fetching-roles' | 'environment' | 'roles' | 'saving' | 'complete' | 'error';
  currentRole?: string;
  currentRoleIndex?: number;
  totalRoles?: number;
  currentEndpoint?: string;
  currentEndpointIndex?: number;
  totalEndpoints?: number;
  errorMessage?: string;
  savedPath?: string;
}
