import { useState } from 'react';
import type { SettingsEndpoint } from '../types';
import { getEndpointsByCategory } from '../utils/endpoints';
import { DocsHelpButton } from './docs';

interface SettingsTreeProps {
  endpoints: SettingsEndpoint[];
  selectedEndpoint: SettingsEndpoint | null;
  onSelectEndpoint: (endpoint: SettingsEndpoint) => void;
  hasData: (path: string) => boolean;
  hasDiff: (path: string) => boolean;
  onOpenDocs?: (filename: string) => void;
}

export function SettingsTree({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
  hasData,
  hasDiff,
  onOpenDocs,
}: SettingsTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['environment', 'role'])
  );

  // Separate endpoints into environment-wide and role-based
  const environmentEndpoints = endpoints.filter((ep) => !ep.roleRequired);
  const roleEndpoints = endpoints.filter((ep) => ep.roleRequired);

  const environmentCategorized = getEndpointsByCategory(environmentEndpoints);
  const roleCategorized = getEndpointsByCategory(roleEndpoints);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const renderCategory = (category: string, categoryEndpoints: SettingsEndpoint[]) => {
    const isExpanded = expandedCategories.has(category);
    const categoryHasDiff = categoryEndpoints.some((ep) => hasDiff(ep.path));

    return (
      <div key={category} className="border border-gray-200 rounded">
        <button
          onClick={() => toggleCategory(category)}
          className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
            <span className="font-medium text-gray-700">{category}</span>
          </div>
          {categoryHasDiff && (
            <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Has differences" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-gray-200">
            {categoryEndpoints.map((endpoint) => {
              const isSelected = selectedEndpoint?.path === endpoint.path;
              const hasEndpointData = hasData(endpoint.path);
              const hasEndpointDiff = hasDiff(endpoint.path);

              return (
                <div
                  key={endpoint.path}
                  className={`flex items-center justify-between hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <button
                    onClick={() => onSelectEndpoint(endpoint)}
                    className="flex-1 px-4 py-2 text-left text-sm flex items-center justify-between"
                  >
                    <span className={hasEndpointData ? 'text-gray-700' : 'text-gray-400'}>
                      {endpoint.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {hasEndpointDiff && (
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Has differences" />
                      )}
                      {!hasEndpointData && <span className="text-xs text-gray-400">No data</span>}
                    </div>
                  </button>
                  {onOpenDocs && (
                    <DocsHelpButton
                      endpoint={endpoint.path}
                      onOpenDocs={onOpenDocs}
                      className="mr-2"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (
    sectionKey: string,
    title: string,
    categorized: Record<string, SettingsEndpoint[]>,
    emptyMessage?: string
  ) => {
    const allEndpoints = Object.values(categorized).flat();
    const sectionHasDiff = allEndpoints.some((ep) => hasDiff(ep.path));
    const isExpanded = expandedSections.has(sectionKey);
    const isEmpty = allEndpoints.length === 0;

    return (
      <div key={sectionKey} className="mb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-2 py-2 flex items-center justify-between text-left border-b-2 border-gray-300 mb-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
            <span className="font-semibold text-gray-800">{title}</span>
            <span className="text-xs text-gray-500">({allEndpoints.length})</span>
          </div>
          {sectionHasDiff && (
            <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Has differences" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-2 pl-2">
            {isEmpty ? (
              <p className="text-sm text-gray-400 italic px-2">{emptyMessage}</p>
            ) : (
              Object.entries(categorized).map(([category, categoryEndpoints]) =>
                renderCategory(category, categoryEndpoints)
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderSection(
        'environment',
        'Environment Settings',
        environmentCategorized,
        'No environment settings'
      )}
      {renderSection(
        'role',
        'Role-Based Settings',
        roleCategorized,
        'Select a role to view role-based settings'
      )}
    </div>
  );
}
