import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Globe,
  Code2,
} from 'lucide-react';
import { PageHeader, StatCard } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { api, getErrorMessage } from '../../lib/api';
import { RESOURCE_CATEGORIES, cn, formatHumanDate } from '../../lib/utils';
import type { ResourceItem } from '../../types';

const emptyForm = { title: '', description: '', url: '', category: 'Web Development', type: 'link', uploadedBy: '' };

export default function AdminResources() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/resources');
      setResources(res.data.resources);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (r: ResourceItem) => {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description,
      url: r.url,
      category: r.category,
      type: r.type || 'link',
      uploadedBy: r.uploadedBy || '',
    });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Title and URL are required.');
      return;
    }
    setBusy(true);
    try {
      const res = editing
        ? await api.put(`/admin/resources/${editing._id}`, form)
        : await api.post('/admin/resources', form);
      toast.success(res.data.message || 'Resource saved successfully.');
      setModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove resource "${title}"?`)) return;
    try {
      const res = await api.delete(`/admin/resources/${id}`);
      toast.success(res.data.message || 'Resource removed.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Filtered resources
  const filtered = resources.filter((r) => {
    const matchesCat = filterCategory === 'All' || r.category === filterCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      r.title.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.uploadedBy && r.uploadedBy.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const uniqueCategories = Array.from(new Set(resources.map((r) => r.category))).length;
  const webDevCount = resources.filter((r) => r.category === 'Web Development' || r.category === 'Programming').length;
  const aiCloudCount = resources.filter((r) => r.category === 'AI/ML' || r.category === 'Cloud').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Center"
        subtitle="Manage tutorials, study kits, documentation links, and student resources."
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Resource
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-navy-100 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Total Resources</p>
          <p className="mt-1 font-mono text-2xl font-bold text-navy-900">{resources.length}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Active Categories</p>
          <p className="mt-1 font-mono text-2xl font-bold text-purple-800">{uniqueCategories}</p>
        </div>
        <div className="rounded-xl border border-g-blue/20 bg-g-blue/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-g-blue">Web & Programming</p>
          <p className="mt-1 font-mono text-2xl font-bold text-g-blue">{webDevCount}</p>
        </div>
        <div className="rounded-xl border border-g-green/20 bg-g-green/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">AI / ML & Cloud</p>
          <p className="mt-1 font-mono text-2xl font-bold text-green-700">{aiCloudCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or author…"
            className="input pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input text-xs font-semibold !py-2"
          >
            <option value="All">All Categories ({resources.length})</option>
            {RESOURCE_CATEGORIES.map((cat) => {
              const count = resources.filter((r) => r.category === cat).length;
              return (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <PageLoader label="Loading resources…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-purple-600" />}
          title={searchQuery || filterCategory !== 'All' ? 'No matching resources' : 'No resources yet'}
          description={
            searchQuery || filterCategory !== 'All'
              ? 'Try changing your search query or category filter.'
              : 'Add your first developer resource or tutorial to share with students.'
          }
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Add Resource
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint bg-slate-50/50">
                <th className="p-4 font-medium">Resource Title</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Resource Link</th>
                <th className="p-4 font-medium">Uploaded By</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {filtered.map((r) => (
                <tr key={r._id} className="transition hover:bg-slate-50/80">
                  <td className="max-w-[280px] p-4">
                    <p className="truncate font-semibold text-navy-900">{r.title}</p>
                    {r.description && <p className="truncate text-xs text-ink-muted mt-0.5">{r.description}</p>}
                  </td>
                  <td className="p-4">
                    <span className="chip bg-purple-100 text-purple-800 text-[11px] font-semibold">
                      {r.category}
                    </span>
                  </td>
                  <td className="max-w-[220px] p-4">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-xs text-g-blue hover:underline"
                    >
                      <span className="truncate">{r.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>
                  <td className="p-4 text-xs font-medium text-ink-soft">{r.uploadedBy || 'GDGoC Team'}</td>
                  <td className="p-4 text-xs text-ink-muted">{formatHumanDate(r.createdAt)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-g-blue/10 hover:text-g-blue"
                        title="Edit Resource"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(r._id, r.title)}
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-g-red/10 hover:text-g-red"
                        title="Delete Resource"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add / Edit */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Resource' : 'Add New Resource'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Resource Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Fullstack React & Node.js Roadmap"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-y"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief explanation of what this resource covers..."
            />
          </div>
          <div>
            <label className="label">Resource URL (Link) *</label>
            <input
              className="input font-mono text-sm"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://github.com/... or https://docs.google.com/..."
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Uploaded By / Author</label>
              <input
                className="input"
                value={form.uploadedBy}
                onChange={(e) => setForm((f) => ({ ...f, uploadedBy: e.target.value }))}
                placeholder="e.g. Technical Team"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Saving…' : editing ? 'Update Resource' : 'Add Resource'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
