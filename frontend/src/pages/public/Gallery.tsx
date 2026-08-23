import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ImageIcon } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { GALLERY_CATEGORIES } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { GalleryItem } from '../../types';

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<GalleryItem | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get('/gallery', { params: { category: filter } })
      .then((res) => mounted && setItems(res.data.items))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filter]);

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 pt-32 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 left-1/3 h-64 w-64 rounded-full bg-g-red/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-g-yellow/15 blur-3xl" />
        </div>
        <div className="container-x relative z-10">
          <span className="chip border border-white/15 bg-white/5 text-white/80">Gallery</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">Event Gallery</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base">
            Moments from our workshops, hackathons, meetups and the community.
          </p>
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
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {GALLERY_CATEGORIES.map((cat) => (
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
            <PageLoader label="Loading gallery…" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-7 w-7" />}
              title="No photos yet"
              description="Photos from our events will appear here."
            />
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setViewer(item)}
                  className="group relative block w-full overflow-hidden rounded-2xl shadow-card transition-all duration-300 hover:shadow-lift"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <img
                    src={item.image}
                    alt={item.title || item.category}
                    loading="lazy"
                    className="w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute bottom-3 left-3 text-left opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-sm font-semibold text-white">{item.title || item.category}</p>
                    <p className="text-xs text-white/70">{item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {viewer && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/90 p-4 backdrop-blur-sm" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={viewer.image} alt={viewer.title} className="max-h-[80vh] w-full object-contain" />
            <div className="flex items-center justify-between bg-white px-5 py-3">
              <div>
                <p className="font-semibold text-navy-900">{viewer.title || 'Gallery photo'}</p>
                <p className="text-xs text-ink-muted">{viewer.category}</p>
              </div>
              <button onClick={() => setViewer(null)} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-800">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
