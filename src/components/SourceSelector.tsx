import { useMemo } from 'react';
import type { SnapshotMetadata, ComparisonSource } from '../types/snapshot';

interface SourceSelectorProps {
  label: string;
  snapshots: Map<string, SnapshotMetadata[]>;
  selectedSource: ComparisonSource | null;
  onSourceChange: (source: ComparisonSource | null) => void;
  disabled?: boolean;
}

interface SnapshotOption {
  key: string;
  label: string;
  environment: string;
  snapshot: SnapshotMetadata;
}

interface EnvironmentGroup {
  envName: string;
  options: SnapshotOption[];
}

export function SourceSelector({
  label,
  snapshots,
  selectedSource,
  onSourceChange,
  disabled,
}: SourceSelectorProps) {
  // Build grouped options: each environment's snapshots sorted by date desc
  const groupedOptions = useMemo((): EnvironmentGroup[] => {
    const groups: EnvironmentGroup[] = [];

    // Get all environment names from snapshots
    const sortedEnvNames = Array.from(snapshots.keys()).sort();

    for (const envName of sortedEnvNames) {
      const envSnapshots = snapshots.get(envName) || [];

      // Sort by timestamp descending (newest first)
      const sortedSnapshots = [...envSnapshots].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const options: SnapshotOption[] = sortedSnapshots.map((snapshot) => {
        const date = new Date(snapshot.timestamp);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes} (UTC)`;

        return {
          key: `snapshot:${snapshot.filename}`,
          label: `[${envName}] ${formattedDate}`,
          environment: envName,
          snapshot,
        };
      });

      if (options.length > 0) {
        groups.push({ envName, options });
      }
    }

    return groups;
  }, [snapshots]);

  // Flat list for lookups
  const allOptions = useMemo(
    () => groupedOptions.flatMap((g) => g.options),
    [groupedOptions]
  );

  // Get current selection key
  const selectedKey = selectedSource?.type === 'snapshot'
    ? `snapshot:${selectedSource.snapshot.filename}`
    : '';

  const handleChange = (value: string) => {
    if (!value) {
      onSourceChange(null);
      return;
    }

    const option = allOptions.find((o) => o.key === value);
    if (!option) return;

    onSourceChange({ type: 'snapshot', snapshot: option.snapshot });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <select
        value={selectedKey}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select snapshot...</option>

        {groupedOptions.map((group) => (
          <optgroup key={group.envName} label={group.envName}>
            {group.options.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Status indicator */}
      {selectedSource?.type === 'snapshot' && (
        <div className="text-xs text-gray-500">
          Snapshot by {selectedSource.snapshot.generatedBy}
        </div>
      )}

      {groupedOptions.length === 0 && (
        <div className="text-xs text-amber-600">
          No snapshots available. Generate a snapshot first.
        </div>
      )}
    </div>
  );
}
