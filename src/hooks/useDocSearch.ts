import { useState, useEffect, useCallback, useRef } from 'react';
import FlexSearch from 'flexsearch';
import type { SearchIndexEntry, SearchResult, DocMetadata } from '../types/docs';

const DOCS_BASE_PATH = '/docs-processed';

interface UseDocSearchOptions {
  metadata: DocMetadata[];
}

export function useDocSearch({ metadata }: UseDocSearchOptions) {
  const [isIndexLoading, setIsIndexLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  // Use ref to store index to avoid re-renders
  const indexRef = useRef<FlexSearch.Index | null>(null);
  const entriesRef = useRef<SearchIndexEntry[]>([]);

  // Load search index on mount
  useEffect(() => {
    async function loadSearchIndex() {
      try {
        setIsIndexLoading(true);
        setIndexError(null);

        const res = await fetch(`${DOCS_BASE_PATH}/search-index.json`);
        if (!res.ok) {
          throw new Error('Failed to load search index');
        }

        const entries: SearchIndexEntry[] = await res.json();
        entriesRef.current = entries;

        // Create FlexSearch index
        const index = new FlexSearch.Index({
          tokenize: 'forward',
          resolution: 9
        });

        // Add documents to index
        for (const entry of entries) {
          index.add(entry.id, `${entry.title} ${entry.content}`);
        }

        indexRef.current = index;
      } catch (err) {
        setIndexError(err instanceof Error ? err.message : 'Failed to load search index');
      } finally {
        setIsIndexLoading(false);
      }
    }

    loadSearchIndex();
  }, []);

  // Search function
  const search = useCallback((query: string, limit: number = 20): SearchResult[] => {
    if (!indexRef.current || !query.trim()) {
      return [];
    }

    try {
      // Search the index
      const resultIds = indexRef.current.search(query, limit) as number[];

      // Map IDs back to entries and enrich with metadata
      const results: SearchResult[] = [];

      for (const id of resultIds) {
        const entry = entriesRef.current[id];
        if (!entry) continue;

        const meta = metadata.find(m => m.filename === entry.filename);

        // Create a snippet with search term highlighted context
        const lowerContent = entry.content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const matchIndex = lowerContent.indexOf(lowerQuery);

        let snippet: string | undefined = undefined;
        if (matchIndex >= 0) {
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(entry.content.length, matchIndex + query.length + 50);
          snippet = (start > 0 ? '...' : '') +
            entry.content.substring(start, end) +
            (end < entry.content.length ? '...' : '');
        }

        results.push({
          filename: entry.filename,
          title: entry.title,
          breadcrumbs: meta?.breadcrumbs || [],
          score: 1 - (resultIds.indexOf(id) / resultIds.length), // Simple relevance score
          snippet
        });
      }

      return results;
    } catch {
      return [];
    }
  }, [metadata]);

  // Quick filter by title/keywords (for when index isn't ready)
  const quickFilter = useCallback((query: string, limit: number = 20): SearchResult[] => {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return metadata
      .filter(m =>
        m.title.toLowerCase().includes(lowerQuery) ||
        m.keywords.some(k => k.includes(lowerQuery)) ||
        m.breadcrumbs.some(b => b.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit)
      .map(m => ({
        filename: m.filename,
        title: m.title,
        breadcrumbs: m.breadcrumbs,
        score: m.title.toLowerCase().includes(lowerQuery) ? 1 : 0.5
      }));
  }, [metadata]);

  return {
    search,
    quickFilter,
    isIndexLoading,
    indexError,
    isReady: !isIndexLoading && indexRef.current !== null
  };
}
