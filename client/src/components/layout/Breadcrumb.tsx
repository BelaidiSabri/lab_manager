import { Link } from 'react-router-dom';

export type Crumb = { label: string; to?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-fg-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">/</span>}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="font-medium text-primary hover:text-primary-hover">
                {item.label}
              </Link>
            ) : (
              <span className={i === items.length - 1 ? 'font-medium text-slate-800' : ''}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
