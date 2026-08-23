import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, BookOpen, Search } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { RESOURCE_CATEGORIES, cn } from '../../lib/utils';
import type { ResourceItem } from '../../types';

export default function Resources() {
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

  const displayed = resources;

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 pt-32 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 left-1/3 h-64 w-64 rounded-full bg-g-blue/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-g-green/15 blur-3xl" />
        </div>
        <div className="container-x relative z-10">
          <span className="chip border border-white/15 bg-white/5 text-white/80">Learning Hub</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">Resources</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base">
            Curated links and materials shared by the GDGoC GCEE community.
          </p>
          <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm">
            <Search className="ml-2 h-4 w-4 shrink-0 text-white/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources…"
              className="w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
        </div>
        <div className="relative z-10 mt-10 flex h-1.5">
          <div className="flex-1 bg-g-blue" />
          <div className="flex-1 bg-g-green" />
          <div className="flex-1 bg-g-yellow" />
          <div className="flex-1 bg-g-red" />
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap gap-2">
            {['All', ...RESOURCE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all',
                  filter === cat ? 'bg-navy-900 text-white' : 'border border-navy-100 bg-white text-ink-soft hover:text-navy-900'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <PageLoader label="Loading resources…" />
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="No resources found"
              description="Try a different category or search term."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((res, i) => (
                <a
                  key={res._id}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="chip bg-g-blue/10 text-blue-700">{res.category}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-g-blue" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold leading-snug text-navy-900 transition-colors group-hover:text-g-blue">
                    {res.title}
                  </h3>
                  {res.description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{res.description}</p>}
                  <div className="mt-auto pt-4">
                    <p className="text-xs text-ink-faint">
                      Shared by {res.uploadedBy || 'GDGoC GCEE'} ·{' '}
                      {res.createdAt ? new Date(res.createdAt).toLocaleDateString('en-IN') : ''}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
