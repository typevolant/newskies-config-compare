interface DocsBreadcrumbsProps {
  breadcrumbs: string[];
}

export function DocsBreadcrumbs({ breadcrumbs }: DocsBreadcrumbsProps) {
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="text-sm text-gray-500 mb-4">
      {breadcrumbs.map((crumb, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-2">&gt;</span>}
          <span className={index === breadcrumbs.length - 1 ? 'text-gray-700' : ''}>
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  );
}
