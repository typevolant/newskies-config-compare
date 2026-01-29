import type { Role } from '../types';

interface RoleSelectorProps {
  roles: Role[];
  selectedRole: string | null;
  onSelectRole: (roleCode: string | null) => void;
  disabled?: boolean;
}

export function RoleSelector({
  roles,
  selectedRole,
  onSelectRole,
  disabled = false,
}: RoleSelectorProps) {
  // Sort roles by name for easier navigation
  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-2">
      <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">
        Select Role for Role-Based Settings
      </label>
      <select
        id="role-select"
        value={selectedRole || ''}
        onChange={(e) => onSelectRole(e.target.value || null)}
        disabled={disabled}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
      >
        <option value="">-- Environment-wide settings only --</option>
        {sortedRoles.map((role) => (
          <option key={role.roleCode} value={role.roleCode}>
            {role.roleCode} - {role.name}
          </option>
        ))}
      </select>
      {selectedRole && (
        <p className="text-xs text-gray-500">
          Comparing settings for role: {selectedRole}
        </p>
      )}
    </div>
  );
}
