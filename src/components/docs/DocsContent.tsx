import { DocsBreadcrumbs } from './DocsBreadcrumbs';
import type { DocContent, DocElement, SettingsTable } from '../../types/docs';

interface DocsContentProps {
  content: DocContent | null;
  isLoading: boolean;
  searchTerm?: string;
  onNavigate?: (filename: string) => void;
}

export function DocsContent({ content, isLoading, searchTerm, onNavigate }: DocsContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documentation...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Select a document from the search results or table of contents
      </div>
    );
  }

  // Get elements array (support both new and legacy format)
  const elements: DocElement[] = content.elements || [];

  // Parse text and render markdown-style links [text](file.html) as clickable elements
  const renderTextWithLinks = (text: string, keyPrefix: string): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+\.html)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let partIndex = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${keyPrefix}-${partIndex++}`}>
            {highlightText(text.substring(lastIndex, match.index))}
          </span>
        );
      }

      const linkText = match[1];
      const filename = match[2];
      parts.push(
        <button
          key={`${keyPrefix}-link-${partIndex++}`}
          onClick={() => onNavigate?.(filename)}
          className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:underline"
        >
          {highlightText(linkText)}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`${keyPrefix}-${partIndex}`}>
          {highlightText(text.substring(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : highlightText(text);
  };

  // Highlight search terms in content
  const highlightText = (text: string): React.ReactNode => {
    if (!searchTerm || searchTerm.length < 2) {
      return text;
    }

    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Render a text block (may contain multiple paragraphs/headers)
  const renderTextBlock = (textContent: string, blockIndex: number): React.ReactNode => {
    return textContent.split('\n').map((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      const key = `block-${blockIndex}-line-${lineIndex}`;

      // Check for markdown headers (check longer patterns first)
      const h6Match = trimmed.match(/^###### (.+)$/);
      if (h6Match) {
        return (
          <h6 key={key} className="text-sm font-semibold text-gray-800 mt-4 mb-2">
            {renderTextWithLinks(h6Match[1], key)}
          </h6>
        );
      }

      const h5Match = trimmed.match(/^##### (.+)$/);
      if (h5Match) {
        return (
          <h5 key={key} className="text-sm font-semibold text-gray-800 mt-4 mb-2">
            {renderTextWithLinks(h5Match[1], key)}
          </h5>
        );
      }

      const h4Match = trimmed.match(/^#### (.+)$/);
      if (h4Match) {
        return (
          <h4 key={key} className="text-base font-semibold text-gray-800 mt-5 mb-2">
            {renderTextWithLinks(h4Match[1], key)}
          </h4>
        );
      }

      const h3Match = trimmed.match(/^### (.+)$/);
      if (h3Match) {
        return (
          <h3 key={key} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
            {renderTextWithLinks(h3Match[1], key)}
          </h3>
        );
      }

      const h2Match = trimmed.match(/^## (.+)$/);
      if (h2Match) {
        return (
          <h2 key={key} className="text-xl font-bold text-gray-900 mt-6 mb-3">
            {renderTextWithLinks(h2Match[1], key)}
          </h2>
        );
      }

      const h1Match = trimmed.match(/^# (.+)$/);
      if (h1Match) {
        return (
          <h2 key={key} className="text-xl font-bold text-gray-900 mt-6 mb-3">
            {renderTextWithLinks(h1Match[1], key)}
          </h2>
        );
      }

      // Regular paragraph
      return (
        <p key={key} className="mb-3 text-gray-700 leading-relaxed">
          {renderTextWithLinks(trimmed, key)}
        </p>
      );
    });
  };

  return (
    <div className="p-6 overflow-auto h-full">
      <DocsBreadcrumbs breadcrumbs={content.breadcrumbs} />

      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {highlightText(content.title)}
      </h1>

      {/* Render elements in document order */}
      <div className="prose prose-sm max-w-none">
        {elements.map((element, index) => {
          if (element.type === 'text') {
            return (
              <div key={`element-${index}`}>
                {renderTextBlock(element.content, index)}
              </div>
            );
          } else if (element.type === 'table') {
            return (
              <div key={`element-${index}`} className="my-6">
                <SettingsTableView
                  table={element.table}
                  searchTerm={searchTerm}
                  onNavigate={onNavigate}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

interface SettingsTableViewProps {
  table: SettingsTable;
  searchTerm?: string;
  onNavigate?: (filename: string) => void;
}

function SettingsTableView({ table, searchTerm, onNavigate }: SettingsTableViewProps) {
  const highlightText = (text: string): React.ReactNode => {
    if (!searchTerm || searchTerm.length < 2) {
      return text;
    }

    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderTextWithLinks = (text: string, keyPrefix: string): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+\.html)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let partIndex = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${keyPrefix}-${partIndex++}`}>
            {highlightText(text.substring(lastIndex, match.index))}
          </span>
        );
      }

      const linkText = match[1];
      const filename = match[2];
      parts.push(
        <button
          key={`${keyPrefix}-link-${partIndex++}`}
          onClick={() => onNavigate?.(filename)}
          className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:underline"
        >
          {highlightText(linkText)}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`${keyPrefix}-${partIndex}`}>
          {highlightText(text.substring(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : highlightText(text);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        {table.headers.length > 0 && (
          <thead className="bg-gray-50">
            <tr>
              {table.headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-200">
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-gray-700"
                >
                  {renderTextWithLinks(cell, `row-${rowIndex}-cell-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
