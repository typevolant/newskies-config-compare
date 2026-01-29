import { getEndpointDocMapping } from '../../config/endpoint-docs-mapping';

interface DocsHelpButtonProps {
  endpoint: string;
  onOpenDocs: (filename: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function DocsHelpButton({ endpoint, onOpenDocs, className = '', size = 'sm' }: DocsHelpButtonProps) {
  const mapping = getEndpointDocMapping(endpoint);

  if (!mapping) {
    return null;  // No documentation available for this endpoint
  }

  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonClasses = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();  // Prevent triggering parent click handlers
        onOpenDocs(mapping.primaryDoc);
      }}
      className={`${buttonClasses} text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ${className}`}
      title={`View documentation for ${endpoint}`}
    >
      <svg
        className={sizeClasses}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  );
}
