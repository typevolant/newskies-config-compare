import { useState, useEffect, useCallback } from 'react';
import { useDocs } from '../../hooks/useDocs';
import { useDocSearch } from '../../hooks/useDocSearch';
import { DocsSearch } from './DocsSearch';
import { DocsContent } from './DocsContent';
import type { DocContent } from '../../types/docs';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: string;  // Optional: open to a specific doc
}

export function DocsModal({ isOpen, onClose, initialDoc }: DocsModalProps) {
  const { metadata, isLoading: metadataLoading, error, loadContent, docsAvailable } = useDocs();
  const { search, isReady: searchReady } = useDocSearch({ metadata });

  // User-selected filename (null means no user selection yet)
  const [userSelectedFilename, setUserSelectedFilename] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showToc, setShowToc] = useState(true);

  // Derive actual selected filename: user selection takes precedence, otherwise initialDoc
  const selectedFilename = userSelectedFilename ?? initialDoc ?? null;

  // Handle user selecting a document
  const handleSelectFilename = useCallback((filename: string) => {
    setUserSelectedFilename(filename);
  }, []);

  // Reset user selection when modal closes (so initialDoc works on reopen)
  const handleClose = useCallback(() => {
    setUserSelectedFilename(null);
    setDocContent(null);
    onClose();
  }, [onClose]);

  // Load content when selection changes
  useEffect(() => {
    let cancelled = false;

    if (!selectedFilename) {
      return;
    }

    async function load() {
      setContentLoading(true);
      const content = await loadContent(selectedFilename!);
      if (!cancelled) {
        setDocContent(content);
        setContentLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedFilename, loadContent]);

  // Handle document selection from search
  const handleSelectResult = useCallback((filename: string) => {
    setUserSelectedFilename(filename);
  }, []);

  // Handle search with term tracking
  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query);
    return search(query);
  }, [search]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-[90vw] h-[85vh] max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Documentation</h2>
            {docsAvailable && (
              <button
                onClick={() => setShowToc(!showToc)}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                {showToc ? 'Hide TOC' : 'Show TOC'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {docsAvailable && (
              <div className="w-80">
                <DocsSearch
                  onSearch={handleSearch}
                  onSelectResult={handleSelectResult}
                  isReady={searchReady}
                />
              </div>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar (Table of Contents) */}
          {docsAvailable && showToc && (
            <div className="w-72 border-r border-gray-200 overflow-auto bg-gray-50">
              <TableOfContents
                metadata={metadata}
                selectedFilename={selectedFilename}
                onSelect={handleSelectFilename}
                isLoading={metadataLoading}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {!docsAvailable ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Documentation Not Available</h3>
                  <p className="text-gray-600">
                    Follow the instructions in the README file to view documentation.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                <div className="text-center">
                  <p className="font-semibold">Error loading documentation</p>
                  <p className="text-sm mt-1">{error}</p>
                  <p className="text-sm text-gray-500 mt-4">
                    Make sure to run <code className="bg-gray-100 px-1 rounded">npm run process-docs</code> first.
                  </p>
                </div>
              </div>
            ) : (
              <DocsContent
                content={docContent}
                isLoading={contentLoading}
                searchTerm={searchTerm}
                onNavigate={handleSelectFilename}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TableOfContentsProps {
  metadata: { filename: string; title: string; breadcrumbs: string[] }[];
  selectedFilename: string | null;
  onSelect: (filename: string) => void;
  isLoading: boolean;
}

function TableOfContents({ metadata, selectedFilename, onSelect, isLoading }: TableOfContentsProps) {
  const [filter, setFilter] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="p-4 text-gray-500 text-center">
        Loading table of contents...
      </div>
    );
  }

  // Group by first breadcrumb (top-level category)
  const grouped = metadata.reduce((acc, doc) => {
    const category = doc.breadcrumbs[0] || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, typeof metadata>);

  // Filter entries
  const filteredGrouped = filter
    ? Object.entries(grouped).reduce((acc, [category, docs]) => {
        const filtered = docs.filter(d =>
          d.title.toLowerCase().includes(filter.toLowerCase()) ||
          d.breadcrumbs.some(b => b.toLowerCase().includes(filter.toLowerCase()))
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {} as Record<string, typeof metadata>)
    : grouped;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Use TOC order if available, otherwise sorted categories
  const sortedCategories = Object.keys(filteredGrouped).sort();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter topics..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        {sortedCategories.length === 0 ? (
          <div className="text-center text-gray-500 text-sm p-4">
            No topics found
          </div>
        ) : (
          sortedCategories.map(category => (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleSection(category)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded text-left"
              >
                <span className="text-gray-400 text-xs">
                  {expandedSections.has(category) ? '▼' : '▶'}
                </span>
                <span className="truncate">{category}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {filteredGrouped[category].length}
                </span>
              </button>

              {expandedSections.has(category) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {filteredGrouped[category].map(doc => (
                    <button
                      key={doc.filename}
                      onClick={() => onSelect(doc.filename)}
                      className={`w-full px-2 py-1.5 text-sm text-left rounded truncate ${
                        selectedFilename === doc.filename
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      title={doc.title}
                    >
                      {doc.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
