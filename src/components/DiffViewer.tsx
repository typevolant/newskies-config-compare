import { useState, useMemo } from 'react';
import type { DiffResult, DiffViewMode } from '../types';
import { formatValue, getDiffColorClass, computeDiff } from '../utils/diff';
import { DocsHelpButton } from './docs';

interface DiffViewerProps {
  leftLabel: string;
  rightLabel: string;
  leftData: unknown;
  rightData: unknown;
  endpointPath?: string;
  onOpenDocs?: (filename: string) => void;
}

export function DiffViewer({
  leftLabel,
  rightLabel,
  leftData,
  rightData,
  endpointPath,
  onOpenDocs,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('side-by-side');
  const [showAllValues, setShowAllValues] = useState(false);

  // Compute diff based on toggle - only include unchanged when showing all values
  const diffs = useMemo(() => {
    return computeDiff(leftData, rightData, '', { includeUnchanged: showAllValues });
  }, [leftData, rightData, showAllValues]);

  // For "differences only" mode, filter out unchanged
  const filteredDiffs = showAllValues
    ? diffs
    : diffs.filter((d) => d.type !== 'unchanged');

  if (!leftData && !rightData) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data available. Fetch settings from both environments to compare.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 text-sm border ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-sm border-t border-b border-r ${
                viewMode === 'unified'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
            >
              Unified
            </button>
          </div>

          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setShowAllValues(false)}
              className={`px-3 py-1 text-sm border ${
                !showAllValues
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
            >
              Differences Only
            </button>
            <button
              onClick={() => setShowAllValues(true)}
              className={`px-3 py-1 text-sm border-t border-b border-r ${
                showAllValues
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
            >
              All Values
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-200 rounded" />
            Added ({diffs.filter((d) => d.type === 'added').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-200 rounded" />
            Removed ({diffs.filter((d) => d.type === 'removed').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-200 rounded" />
            Changed ({diffs.filter((d) => d.type === 'changed').length})
          </span>
          {endpointPath && onOpenDocs && (
            <DocsHelpButton
              endpoint={endpointPath}
              onOpenDocs={onOpenDocs}
              size="md"
            />
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {filteredDiffs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {diffs.length === 0 ? 'No differences found. Switch to "All Values" to see matching fields.' : 'No differences to show.'}
          </div>
        ) : viewMode === 'side-by-side' ? (
          <SideBySideView
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            diffs={filteredDiffs}
          />
        ) : (
          <UnifiedView
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            diffs={filteredDiffs}
          />
        )}
      </div>
    </div>
  );
}

function SideBySideView({
  leftLabel,
  rightLabel,
  diffs,
}: {
  leftLabel: string;
  rightLabel: string;
  diffs: DiffResult[];
}) {
  return (
    <div className="min-w-full">
      {/* Headers */}
      <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-200 sticky top-0">
        <div className="p-2 font-medium text-gray-700 border-r border-gray-200">Path</div>
        <div className="p-2 font-medium text-gray-700 border-r border-gray-200">{leftLabel}</div>
        <div className="p-2 font-medium text-gray-700">{rightLabel}</div>
      </div>

      {/* Rows */}
      {diffs.map((diff, index) => (
        <div
          key={`${diff.path}-${index}`}
          className={`grid grid-cols-3 border-b border-gray-100 ${getDiffColorClass(diff.type)}`}
        >
          <div className="p-2 font-mono text-xs border-r border-gray-200 break-all">
            {diff.path}
          </div>
          <div className="p-2 font-mono text-xs border-r border-gray-200 break-all whitespace-pre-wrap">
            {diff.type === 'added' ? (
              <span className="text-gray-400">—</span>
            ) : (
              formatValue(diff.leftValue)
            )}
          </div>
          <div className="p-2 font-mono text-xs break-all whitespace-pre-wrap">
            {diff.type === 'removed' ? (
              <span className="text-gray-400">—</span>
            ) : (
              formatValue(diff.rightValue)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnifiedView({
  leftLabel,
  rightLabel,
  diffs,
}: {
  leftLabel: string;
  rightLabel: string;
  diffs: DiffResult[];
}) {
  return (
    <div className="p-4 space-y-2">
      <div className="text-sm text-gray-500 mb-4">
        <span className="text-red-600">- {leftLabel}</span>
        {' / '}
        <span className="text-green-600">+ {rightLabel}</span>
      </div>

      {diffs.map((diff, index) => (
        <div key={`${diff.path}-${index}`} className="font-mono text-xs">
          <div className="text-gray-500 mb-1">{diff.path}:</div>
          {diff.type === 'added' && (
            <div className="pl-4 bg-green-100 text-green-800 p-1 rounded">
              + {formatValue(diff.rightValue)}
            </div>
          )}
          {diff.type === 'removed' && (
            <div className="pl-4 bg-red-100 text-red-800 p-1 rounded">
              - {formatValue(diff.leftValue)}
            </div>
          )}
          {diff.type === 'changed' && (
            <>
              <div className="pl-4 bg-red-100 text-red-800 p-1 rounded-t">
                - {formatValue(diff.leftValue)}
              </div>
              <div className="pl-4 bg-green-100 text-green-800 p-1 rounded-b">
                + {formatValue(diff.rightValue)}
              </div>
            </>
          )}
          {diff.type === 'unchanged' && (
            <div className="pl-4 bg-gray-50 text-gray-600 p-1 rounded">
              {formatValue(diff.leftValue)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
