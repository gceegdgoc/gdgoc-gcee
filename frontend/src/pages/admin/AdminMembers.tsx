import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, UsersRound } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { TEAMS, DEPARTMENTS, YEARS } from '../../lib/utils';
import type { Member } from '../../types';

const emptyForm = { name: '', team: 'Community Members', role: 'Member', department: '', year: '', photo: '', github: '', linkedin: '', instagram: '', twitter: '' };

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/members');
      setMembers(res.data.members);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      name: m.name,
      team: m.team,
      role: m.role,
      department: m.department,
      year: m.year,
      photo: m.photo,
      github: m.socialLinks?.github || '',
      linkedin: m.socialLinks?.linkedin || '',
      instagram: m.socialLinks?.instagram || '',
      twitter: m.socialLinks?.twitter || '',
    });
    setModal(true);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Name is required.');
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name,
      team: form.team,
      role: form.role,
      department: form.department,
      year: form.year,
      photo: form.photo,
      socialLinks: { github: form.github, linkedin: form.linkedin, instagram: form.instagram, twitter: form.twitter },
    };
    try {
      const res = editing
        ? await api.put(`/admin/members/${editing._id}`, payload)
        : await api.post('/admin/members', payload);
      toast.success(res.data.message);
      setModal(false);
      loadMembers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Remove member "${name}"?`)) return;
    try {
      const res = await api.delete(`/admin/members/${id}`);
      toast.success(res.data.message);
      loadMembers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const grouped = TEAMS.map((t) => ({ team: t, members: members.filter((m) => m.team === t) })).filter((g) => g.members.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle={`${members.length} team members`}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Add member
          </button>
        }
      />

      {loading ? (
        <PageLoader label="Loading members…" />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-7 w-7" />}
          title="No members yet"
          action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add member</button>}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <div key={g.team}>
              <h2 className="mb-3 font-display text-base font-bold text-navy-900">{g.team} <span className="text-sm font-normal text-ink-muted">({g.members.length})</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.members.map((m) => (
                  <div key={m._id} className="card group flex items-center gap-3 p-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                      {m.photo ? (
                        <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-g-blue to-g-green font-bold text-white">
                          {m.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900">{m.name}</p>
                      <p className="truncate text-xs text-ink-muted">{m.role}</p>
                      <p className="truncate text-[11px] text-ink-faint">{m.department || '—'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(m)} className="rounded-lg p-1.5 text-ink-soft hover:bg-g-blue/10 hover:text-g-blue"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(m._id, m.name)} className="rounded-lg p-1.5 text-ink-soft hover:bg-g-red/10 hover:text-g-red"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit member' : 'Add member'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Team</label>
              <select className="input" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Role</label>
              <input className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. Head, Coordinator" />
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                <option value="">Select</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select className="input" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
                <option value="">Select</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">GitHub URL</label>
              <input className="input" value={form.github} onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))} />
            </div>
            <div>
              <label className="label">LinkedIn URL</label>
              <input className="input" value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} />
            </div>
            <div>
              <label className="label">Instagram URL</label>
              <input className="input" value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} />
            </div>
            <div>
              <label className="label">Twitter URL</label>
              <input className="input" value={form.twitter} onChange={(e) => setForm((f) => ({ ...f, twitter: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Photo</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="text-sm text-ink-muted" />
              {form.photo && <img src={form.photo} alt="preview" className="h-12 w-12 rounded-lg object-cover" />}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <ButtonSpinner /> : null}
              {busy ? 'Saving…' : editing ? 'Update' : 'Add member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
