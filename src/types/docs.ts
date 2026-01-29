// Documentation metadata (from metadata.json)
export interface DocMetadata {
  filename: string;
  title: string;
  breadcrumbs: string[];
  keywords: string[];
}

// Settings table extracted from documentation
export interface SettingsTable {
  headers: string[];
  rows: string[][];
}

// Content element - either text or table, maintains document order
export type DocElement =
  | { type: 'text'; content: string }
  | { type: 'table'; table: SettingsTable };

// Full document content (from content/*.json, lazy-loaded)
export interface DocContent {
  filename: string;
  title: string;
  breadcrumbs: string[];
  elements: DocElement[];
  // Legacy fields for backwards compatibility
  content?: string;
  tables?: SettingsTable[];
}

// Table of contents entry (from toc.json)
export interface TocEntry {
  href: string;
  title: string;
}

// Search index entry (from search-index.json)
export interface SearchIndexEntry {
  id: number;
  filename: string;
  title: string;
  content: string;
}

// Search result
export interface SearchResult {
  filename: string;
  title: string;
  breadcrumbs: string[];
  score: number;
  snippet?: string;
}

// Documentation state
export interface DocsState {
  metadata: DocMetadata[];
  toc: TocEntry[];
  isLoading: boolean;
  error: string | null;
}
