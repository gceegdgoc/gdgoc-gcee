import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, UploadCloud, Trash2, ImageIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { api, getErrorMessage } from '../../lib/api';
import { GALLERY_CATEGORIES } from '../../lib/utils';
import type { GalleryItem } from '../../types';

export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Meetups', image: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gallery');
      setItems(res.data.items);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image) {
      toast.error('Please choose an image.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        '/admin/gallery',
        { title: form.title, category: form.category, image: form.image },
        { headers: { 'Content-Type': 'application/json' } }
      );
      toast.success(res.data.message);
      setModal(false);
      setForm({ title: '', category: 'Meetups', image: '' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this gallery item?')) return;
    try {
      const res = await api.delete(`/admin/gallery/${id}`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gallery"
        subtitle={`${items.length} photos`}
        actions={
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Upload photo
          </button>
        }
      />

      {loading ? (
        <PageLoader label="Loading gallery…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-7 w-7" />}
          title="No photos yet"
          action={
            <button onClick={() => setModal(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Upload photo
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-2xl">
              <img src={item.image} alt={item.title} className="h-40 w-full object-cover sm:h-48" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="truncate text-sm font-semibold text-white">{item.title || item.category}</p>
                <p className="text-xs text-white/60">{item.category}</p>
              </div>
              <button
                onClick={() => remove(item.id)}
                className="absolute right-2 top-2 rounded-lg bg-navy-950/70 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-g-red"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Upload photo">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Git Workshop" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {GALLERY_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 p-8 transition hover:border-g-blue hover:bg-g-blue/5">
            <UploadCloud className="h-6 w-6 text-g-blue" />
            <span className="text-sm font-medium text-navy-900">Choose image</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
          {form.image && <img src={form.image} alt="preview" className="h-32 w-full rounded-xl object-cover" />}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
