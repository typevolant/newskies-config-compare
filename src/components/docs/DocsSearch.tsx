import { useState, useCallback, useEffect, useRef } from 'react';
import type { SearchResult } from '../../types/docs';

interface DocsSearchProps {
  onSearch: (query: string) => SearchResult[];
  onSelectResult: (filename: string) => void;
  isReady: boolean;
}

export function DocsSearch({ onSearch, onSelectResult, isReady }: DocsSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        const searchResults = onSearch(query);
        setResults(searchResults);
        setShowResults(true);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          onSelectResult(results[selectedIndex].filename);
          setShowResults(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  }, [showResults, results, selectedIndex, onSelectResult]);

  // Handle click outside to close results
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={isReady ? 'Search documentation...' : 'Loading search index...'}
          disabled={!isReady}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-auto"
        >
          {results.map((result, index) => (
            <button
              key={result.filename}
              onClick={() => {
                onSelectResult(result.filename);
                setShowResults(false);
                setQuery('');
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{result.title}</div>
              {result.breadcrumbs.length > 0 && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {result.breadcrumbs.join(' > ')}
                </div>
              )}
              {result.snippet && (
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {result.snippet}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
