import { useState, useEffect, useCallback } from 'react';
import type { DocMetadata, DocContent, TocEntry, DocsState } from '../types/docs';

const DOCS_BASE_PATH = '/docs-processed';

export function useDocs(): DocsState & {
  loadContent: (filename: string) => Promise<DocContent | null>;
  getMetadata: (filename: string) => DocMetadata | undefined;
  docsAvailable: boolean;
} {
  const [metadata, setMetadata] = useState<DocMetadata[]>([]);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docsAvailable, setDocsAvailable] = useState(true);

  // Content cache for lazy-loaded documents
  const [contentCache] = useState<Map<string, DocContent>>(new Map());

  // Load metadata and TOC on mount
  useEffect(() => {
    async function loadDocsData() {
      try {
        setIsLoading(true);
        setError(null);

        const [metadataRes, tocRes] = await Promise.all([
          fetch(`${DOCS_BASE_PATH}/metadata.json`),
          fetch(`${DOCS_BASE_PATH}/toc.json`)
        ]);

        if (!metadataRes.ok) {
          // Docs not available (404) vs other errors
          if (metadataRes.status === 404) {
            setDocsAvailable(false);
            setMetadata([]);
            return;
          }
          throw new Error('Failed to load documentation metadata');
        }

        const metadataData = await metadataRes.json();
        setMetadata(metadataData);
        setDocsAvailable(true);

        if (tocRes.ok) {
          const tocData = await tocRes.json();
          setToc(tocData);
        }
      } catch (err) {
        // Network errors or fetch failures likely mean docs aren't available
        setDocsAvailable(false);
        setError(err instanceof Error ? err.message : 'Failed to load documentation');
      } finally {
        setIsLoading(false);
      }
    }

    loadDocsData();
  }, []);

  // Load content for a specific document (lazy loading)
  const loadContent = useCallback(async (filename: string): Promise<DocContent | null> => {
    // Check cache first
    if (contentCache.has(filename)) {
      return contentCache.get(filename)!;
    }

    try {
      const contentFilename = filename.replace('.html', '.json');
      const res = await fetch(`${DOCS_BASE_PATH}/content/${contentFilename}`);

      if (!res.ok) {
        return null;
      }

      const content = await res.json();
      contentCache.set(filename, content);
      return content;
    } catch {
      return null;
    }
  }, [contentCache]);

  // Get metadata for a specific document
  const getMetadata = useCallback((filename: string): DocMetadata | undefined => {
    return metadata.find(m => m.filename === filename);
  }, [metadata]);

  return {
    metadata,
    toc,
    isLoading,
    error,
    loadContent,
    getMetadata,
    docsAvailable
  };
}
