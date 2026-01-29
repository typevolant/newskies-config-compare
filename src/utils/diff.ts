import type { DiffResult, DiffType } from '../types';

export interface DiffOptions {
  includeUnchanged?: boolean;
}

// Check if array contains only primitive values (strings, numbers, booleans)
function isPrimitiveArray(arr: unknown[]): boolean {
  return arr.every(item =>
    typeof item === 'string' ||
    typeof item === 'number' ||
    typeof item === 'boolean' ||
    item === null
  );
}

// Compare arrays as sets (for primitive arrays)
function compareArraysAsSet(left: unknown[], right: unknown[], path: string, options: DiffOptions): DiffResult[] {
  const results: DiffResult[] = [];
  const leftSet = new Set(left.map(v => JSON.stringify(v)));
  const rightSet = new Set(right.map(v => JSON.stringify(v)));

  // Find removed items (in left but not in right)
  const removed: unknown[] = [];
  for (const item of left) {
    if (!rightSet.has(JSON.stringify(item))) {
      removed.push(item);
    }
  }

  // Find added items (in right but not in left)
  const added: unknown[] = [];
  for (const item of right) {
    if (!leftSet.has(JSON.stringify(item))) {
      added.push(item);
    }
  }

  // Find unchanged items (in both)
  const unchanged: unknown[] = [];
  if (options.includeUnchanged) {
    for (const item of left) {
      if (rightSet.has(JSON.stringify(item))) {
        unchanged.push(item);
      }
    }
  }

  if (removed.length > 0) {
    results.push({
      path: `${path} (removed)`,
      type: 'removed',
      leftValue: removed
    });
  }

  if (added.length > 0) {
    results.push({
      path: `${path} (added)`,
      type: 'added',
      rightValue: added
    });
  }

  if (options.includeUnchanged && unchanged.length > 0) {
    results.push({
      path: `${path} (unchanged)`,
      type: 'unchanged',
      leftValue: unchanged,
      rightValue: unchanged
    });
  }

  return results;
}

// Deep compare two JSON values and return differences
export function computeDiff(left: unknown, right: unknown, path = '', options: DiffOptions = {}): DiffResult[] {
  const results: DiffResult[] = [];

  // Handle null/undefined
  if (left === null || left === undefined) {
    if (right === null || right === undefined) {
      return results;
    }
    results.push({ path: path || '(root)', type: 'added', rightValue: right });
    return results;
  }

  if (right === null || right === undefined) {
    results.push({ path: path || '(root)', type: 'removed', leftValue: left });
    return results;
  }

  // Different types
  if (typeof left !== typeof right) {
    results.push({ path: path || '(root)', type: 'changed', leftValue: left, rightValue: right });
    return results;
  }

  // Primitives
  if (typeof left !== 'object') {
    if (left !== right) {
      results.push({ path: path || '(root)', type: 'changed', leftValue: left, rightValue: right });
    } else if (options.includeUnchanged) {
      results.push({ path: path || '(root)', type: 'unchanged', leftValue: left, rightValue: right });
    }
    return results;
  }

  // Arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    // For arrays of primitives, compare as sets (order doesn't matter)
    if (isPrimitiveArray(left) && isPrimitiveArray(right)) {
      return compareArraysAsSet(left, right, path || '(array)', options);
    }

    // For arrays of objects, compare by index (existing behavior)
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= left.length) {
        results.push({ path: itemPath, type: 'added', rightValue: right[i] });
      } else if (i >= right.length) {
        results.push({ path: itemPath, type: 'removed', leftValue: left[i] });
      } else {
        results.push(...computeDiff(left[i], right[i], itemPath, options));
      }
    }
    return results;
  }

  // Objects
  if (typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const leftObj = left as Record<string, unknown>;
    const rightObj = right as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;
      if (!(key in leftObj)) {
        results.push({ path: keyPath, type: 'added', rightValue: rightObj[key] });
      } else if (!(key in rightObj)) {
        results.push({ path: keyPath, type: 'removed', leftValue: leftObj[key] });
      } else {
        results.push(...computeDiff(leftObj[key], rightObj[key], keyPath, options));
      }
    }
    return results;
  }

  return results;
}

// Format a value for display
export function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Get color class for diff type
export function getDiffColorClass(type: DiffType): string {
  switch (type) {
    case 'added':
      return 'bg-green-100 text-green-800';
    case 'removed':
      return 'bg-red-100 text-red-800';
    case 'changed':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-50 text-gray-600';
  }
}

// Group diff results by path prefix (for tree view)
export function groupDiffByPrefix(diffs: DiffResult[]): Record<string, DiffResult[]> {
  return diffs.reduce((acc, diff) => {
    const prefix = diff.path.split('.')[0] || '(root)';
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(diff);
    return acc;
  }, {} as Record<string, DiffResult[]>);
}
