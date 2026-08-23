import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDateTime, cn } from '../../lib/utils';

export default function AdminFormRegistrations() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/form-registrations?page=${p}&limit=15`);
      setRegistrations(res.data.registrations);
      setTotal(res.data.total);
      setUnreadCount(res.data.unreadCount);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      load(page);
    }, 30000);
    return () => clearInterval(interval);
  }, [page, load]);

  const refresh = () => load(page);

  const openDetail = async (reg: any) => {
    try {
      const res = await api.get(`/admin/form-registrations/${reg._id}`);
      setSelected(res.data.registration);
      if (!reg.isRead) {
        await api.patch(`/admin/form-registrations/${reg._id}/read`);
        setRegistrations((prev) => prev.map((r) => r._id === reg._id ? { ...r, isRead: true } : r));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Form Registrations"
        subtitle={`Google Form submissions · ${total} total · ${unreadCount} unread`}
        actions={
          <button onClick={refresh} className="btn-outline">
            <Bell className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {loading ? (
        <PageLoader label="Loading registrations…" />
      ) : registrations.length === 0 ? (
        <EmptyState title="No Google Form registrations yet." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Student</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Department</th>
                  <th className="p-4 font-medium">Year</th>
                  <th className="p-4 font-medium">Submitted</th>
                  <th className="p-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {registrations.map((r) => (
                  <tr
                    key={r._id}
                    className={cn(
                      'transition hover:bg-navy-50/50 cursor-pointer',
                      !r.isRead && 'bg-g-blue/5'
                    )}
                    onClick={() => openDetail(r)}
                  >
                    <td className="p-4">
                      {r.isRead ? (
                        <span className="chip bg-navy-50 text-ink-faint">Read</span>
                      ) : (
                        <span className="chip bg-g-blue/10 text-g-blue font-semibold">New</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-navy-900">{r.name || '—'}</td>
                    <td className="p-4 text-ink-soft">{r.email || '—'}</td>
                    <td className="p-4 text-ink-soft">{r.department || '—'}</td>
                    <td className="p-4 text-ink-soft">{r.year || '—'}</td>
                    <td className="p-4 text-ink-muted text-xs">{formatHumanDateTime(r.submittedAt)}</td>
                    <td className="p-4">
                      <button className="text-sm font-semibold text-g-blue hover:underline flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); load(p); }}
                  className="btn-outline !px-3 !py-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); load(p); }}
                  className="btn-outline !px-3 !py-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-navy-900">Student Registration</h2>
                <p className="mt-1 text-sm text-ink-muted">Complete Google Form submission data</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-ink-muted hover:bg-navy-50">✕</button>
            </div>

            <div className="space-y-3">
              {Object.entries(selected.formData || {}).map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 rounded-lg bg-slate-50 p-3">
                  <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-ink-faint">{key}</span>
                  <span className="text-sm text-navy-900 break-words">{String(value || '—')}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-navy-50 p-4 text-sm text-ink-muted">
              <span>Submitted: {formatHumanDateTime(selected.submittedAt)}</span>
              {selected.responseId && <span className="font-mono text-xs text-ink-faint">Response ID: {selected.responseId}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
