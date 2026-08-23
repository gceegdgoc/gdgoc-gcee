import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Megaphone, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { formatDotDate, cn } from '../../lib/utils';
import type { Campaign } from '../../types';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: 'GDGoC GCEE 2026 Community Participation',
    description: '',
    startDate: '',
    endDate: '',
    minimumAttendancePercentage: '75',
    minimumEligibleEvents: '4',
    releaseDate: '',
    status: 'ACTIVE',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/certificate-campaigns');
      setCampaigns(res.data.campaigns);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error('Campaign name, start date and end date are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/admin/certificate-campaigns', {
        ...form,
        minimumAttendancePercentage: Number(form.minimumAttendancePercentage),
        minimumEligibleEvents: Number(form.minimumEligibleEvents),
      });
      toast.success(res.data.message);
      setModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Campaigns"
        subtitle="Configure consolidated certificate campaigns for eligible events."
        actions={
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New campaign
          </button>
        }
      />

      {loading ? (
        <PageLoader label="Loading campaigns…" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-7 w-7" />}
          title="No campaigns yet"
          description="Create a certificate campaign to define eligibility and generate certificates."
          action={
            <button onClick={() => setModal(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> New campaign
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <div key={c._id} className="card flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
                  <Megaphone className="h-5 w-5" />
                </div>
                <span className={cn('chip', c.status === 'ACTIVE' ? 'bg-g-green/10 text-green-700' : c.status === 'CLOSED' ? 'bg-navy-900/5 text-navy-800' : 'bg-g-yellow/15 text-yellow-700')}>
                  {c.status}
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-navy-900">{c.name}</h3>
              <p className="mt-1 font-mono text-xs text-ink-soft">
                {formatDotDate(c.startDate)} → {formatDotDate(c.endDate)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-navy-50 p-3">
                  <p className="text-xs text-ink-muted">Min attendance</p>
                  <p className="mt-0.5 font-bold text-navy-900">{c.minimumAttendancePercentage}%</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-3">
                  <p className="text-xs text-ink-muted">Min events</p>
                  <p className="mt-0.5 font-bold text-navy-900">{c.minimumEligibleEvents}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-navy-50 pt-4">
                <span className="text-xs text-ink-faint">
                  {c.generatedAt ? 'Certificates generated' : 'Not generated yet'}
                </span>
                <Link to={`/admin/certificate-campaigns/${c._id}`} className="flex items-center gap-1 text-sm font-semibold text-g-blue hover:underline">
                  View campaign <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Create certificate campaign" wide>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Campaign name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-y" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Start date (YYYY-MM-DD)</label>
              <input className="input font-mono" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="2026-08-10" />
            </div>
            <div>
              <label className="label">End date (YYYY-MM-DD)</label>
              <input className="input font-mono" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} placeholder="2026-10-10" />
            </div>
            <div>
              <label className="label">Minimum attendance percentage</label>
              <input className="input" type="number" min={0} max={100} value={form.minimumAttendancePercentage} onChange={(e) => setForm((f) => ({ ...f, minimumAttendancePercentage: e.target.value }))} />
            </div>
            <div>
              <label className="label">Minimum eligible events</label>
              <input className="input" type="number" min={0} value={form.minimumEligibleEvents} onChange={(e) => setForm((f) => ({ ...f, minimumEligibleEvents: e.target.value }))} />
            </div>
            <div>
              <label className="label">Release date (YYYY-MM-DD)</label>
              <input className="input font-mono" value={form.releaseDate} onChange={(e) => setForm((f) => ({ ...f, releaseDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <ButtonSpinner /> : null}
              {busy ? 'Creating…' : 'Create campaign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
