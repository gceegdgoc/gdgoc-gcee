import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, BookOpen, Search } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { RESOURCE_CATEGORIES, cn } from '../../lib/utils';
import type { ResourceItem } from '../../types';

export default function StudentResources() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get('/resources', { params: { category: filter, q: query || undefined } })
      .then((res) => mounted && setResources(res.data.resources))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filter, query]);

  if (loading) return <PageLoader label="Loading resources…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">Resources</h1>
        <p className="mt-1 text-sm text-ink-muted">Curated learning materials for the community.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-navy-200 bg-white px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All', ...RESOURCE_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
              filter === cat ? 'bg-navy-900 text-white' : 'border border-navy-100 bg-white text-ink-soft hover:text-navy-900'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {resources.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-7 w-7" />} title="No resources found" description="Try a different category or search term." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((res) => (
            <a key={res._id} href={res.url} target="_blank" rel="noreferrer" className="card group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <span className="chip bg-g-blue/10 text-blue-700">{res.category}</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-g-blue" />
              </div>
              <h3 className="mt-3 font-display text-base font-bold leading-snug text-navy-900 group-hover:text-g-blue">{res.title}</h3>
              {res.description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{res.description}</p>}
              <p className="mt-auto pt-4 text-xs text-ink-faint">Shared by {res.uploadedBy || 'GDGoC GCEE'}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
