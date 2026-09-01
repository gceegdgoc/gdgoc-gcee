import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Download,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  Mail,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import { EventForm } from '../../components/admin/EventForm';
import { api, getErrorMessage, downloadPdf } from '../../lib/api';
import { formatHumanDate, cn, downloadBlob, getEffectiveEventStatus } from '../../lib/utils';
import { SITE_EMAIL } from '../../lib/site';
import type {
  GEvent,
  SendEventToAllResponse,
  SendingHistoryResponse,
  VerifiedStudentCountResponse,
  EventRegistrationRow,
} from '../../types';

type Tab = 'details' | 'registrations' | 'email';

export default function AdminEventDetail() {
  const { eventId } = useParams();
  const [params] = useSearchParams();
  const tabParam = params.get('tab');
  const [event, setEvent] = useState<GEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>(
    tabParam === 'email' ? 'email' : tabParam === 'registrations' ? 'registrations' : 'details'
  );

  useEffect(() => {
    if (tabParam === 'email' || tabParam === 'registrations' || tabParam === 'details') {
      setTab(tabParam as Tab);
    }
  }, [tabParam]);

  useEffect(() => {
    let mounted = true;
    api
      .get(`/admin/events/${eventId}`)
      .then((res) => mounted && setEvent(res.data.event))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [eventId, reloadKey]);

  const handleToggleStatus = async () => {
    if (!event) return;
    const currentStatus = getEffectiveEventStatus(event);
    const nextStatus = currentStatus === 'COMPLETED' ? 'UPCOMING' : 'COMPLETED';
    const actionLabel = currentStatus === 'COMPLETED' ? 'reopen' : 'mark as completed';
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${event.title}"?`)) return;

    try {
      const res = await api.patch(`/admin/events/${event.eventId}/status`, { status: nextStatus });
      toast.success(res.data.message || `Event marked as ${nextStatus}.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageLoader label="Loading event..." />;
  if (!event) return <div className="text-ink-muted">Event not found.</div>;

  const currentStatus = getEffectiveEventStatus(event);
  const isCompleted = currentStatus === 'COMPLETED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Management"
        subtitle={`${event.eventId} — ${event.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={currentStatus} />
            <button
              onClick={handleToggleStatus}
              className={cn(
                'border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition',
                isCompleted
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                  : 'border-green-400 bg-green-50 text-green-800 hover:bg-green-100'
              )}
            >
              {isCompleted ? 'Reopen Event' : 'Mark Completed'}
            </button>
            <Link to="/admin/events" className="border border-black/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black/50 transition hover:text-black">
              <ArrowLeft className="mr-1 inline h-4 w-4" /> All Events
            </Link>
            <Link
              to={`/events/${event.eventId}`}
              target="_blank"
              className="border border-black/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black/50 transition hover:text-black"
            >
              View Public Page
            </Link>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-black/10">
        {(['details', 'registrations', 'email'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all',
              tab === t
                ? 'border-black text-black'
                : 'border-transparent text-black/30 hover:text-black/60'
            )}
          >
            {t === 'details' && 'Edit Details'}
            {t === 'registrations' && 'Registrations'}
            {t === 'email' && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Send Email
                {event.emailSent && <CheckCircle2 className="h-3 w-3 text-green-600" />}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'details' && (
        <EventForm event={event} onSaved={() => setReloadKey((k) => k + 1)} />
      )}

      {tab === 'registrations' && (
        <EventRegistrations eventId={event.eventId} event={event} />
      )}

      {tab === 'email' && (
        <EventEmailSection event={event} onSent={() => setReloadKey((k) => k + 1)} />
      )}
    </div>
  );
}

/* ─── Email Tab ─────────────────────────────────────────────────────── */

function EventEmailSection({ event, onSent }: { event: GEvent; onSent: () => void }) {
  const [recipientType, setRecipientType] = useState<'ALL_STUDENTS' | 'REGISTERED_STUDENTS' | 'SELECTED_STUDENTS'>('ALL_STUDENTS');
  const [customSubject, setCustomSubject] = useState(`Official Invitation: ${event.title} – GDGoC GCEE`);
  const [customMessage, setCustomMessage] = useState('');
  const [posterUrl, setPosterUrl] = useState(event.banner || (event as any).posterUrl || (event as any).poster || '');
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendingResult, setSendingResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Fetch estimated recipient count on recipientType change
  useEffect(() => {
    let mounted = true;
    setLoadingCount(true);
    api
      .get(`/admin/events/${event.eventId}/poster-recipient-count`, { params: { recipientType } })
      .then((res) => {
        if (mounted) setEstimatedCount(res.data.recipientCount);
      })
      .catch(() => {
        if (mounted) setEstimatedCount(null);
      })
      .finally(() => {
        if (mounted) setLoadingCount(false);
      });
    return () => {
      mounted = false;
    };
  }, [event.eventId, recipientType]);

  // Fetch email audit history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/admin/events/${event.eventId}/poster-email-history`);
      setHistory(res.data.history || []);
    } catch {
      // non-critical error
    } finally {
      setLoadingHistory(false);
    }
  }, [event.eventId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSendPoster = async () => {
    if (!window.confirm(`Are you sure you want to send this poster email to ${estimatedCount ?? 'the selected'} recipient(s)?`)) return;

    setSending(true);
    setSendingResult(null);
    try {
      const res = await api.post(`/admin/events/${event.eventId}/send-poster`, {
        recipientType,
        customSubject,
        customMessage,
        posterUrl,
      });
      setSendingResult(res.data);
      toast.success(res.data.message || 'Poster email dispatch completed!');
      onSent();
      loadHistory();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleRetryFailed = async (batchId: string) => {
    setRetrying(batchId);
    try {
      const res = await api.post(`/admin/events/${event.eventId}/retry-poster-email`, { batchId });
      toast.success(res.data.message || 'Retry completed!');
      loadHistory();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Configuration Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-navy-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-g-blue" /> Event Poster Email Campaign
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Distribute event invitation poster emails with responsive branding and direct registration CTA.
            </p>
          </div>
          {event.emailSent && (
            <span className="chip bg-g-green/10 text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Announcement Sent
            </span>
          )}
        </div>

        <div className="mt-6 space-y-5">
          {/* Recipient Filter Selection */}
          <div>
            <label className="label">Target Audience / Recipients</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition',
                recipientType === 'ALL_STUDENTS' ? 'border-g-blue bg-g-blue/5' : 'border-navy-100 hover:bg-navy-50/50'
              )}>
                <input
                  type="radio"
                  name="recipientType"
                  value="ALL_STUDENTS"
                  checked={recipientType === 'ALL_STUDENTS'}
                  onChange={() => setRecipientType('ALL_STUDENTS')}
                  className="h-4 w-4 accent-[#2563eb]"
                />
                <div>
                  <p className="text-sm font-semibold text-navy-900">All Verified Students</p>
                  <p className="text-xs text-ink-muted">Broadcast to all registered GDGoC GCEE members.</p>
                </div>
              </label>

              <label className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition',
                recipientType === 'REGISTERED_STUDENTS' ? 'border-g-blue bg-g-blue/5' : 'border-navy-100 hover:bg-navy-50/50'
              )}>
                <input
                  type="radio"
                  name="recipientType"
                  value="REGISTERED_STUDENTS"
                  checked={recipientType === 'REGISTERED_STUDENTS'}
                  onChange={() => setRecipientType('REGISTERED_STUDENTS')}
                  className="h-4 w-4 accent-[#2563eb]"
                />
                <div>
                  <p className="text-sm font-semibold text-navy-900">Registered Students</p>
                  <p className="text-xs text-ink-muted">Target students who signed up for this specific event.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Recipient Estimate Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-xs text-navy-800">
            <Users className="h-4 w-4 text-g-blue" />
            <span>Estimated Audience Size: </span>
            {loadingCount ? (
              <span className="font-mono font-bold text-ink-muted animate-pulse">Calculating…</span>
            ) : (
              <span className="font-mono font-bold text-g-blue">{estimatedCount ?? 0} recipient(s)</span>
            )}
          </div>

          {/* Custom Subject */}
          <div>
            <label className="label">Email Subject</label>
            <input
              className="input font-medium"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="e.g. Official Invitation: Web Dev Workshop – GDGoC GCEE"
            />
          </div>

          {/* Poster Image URL */}
          <div>
            <label className="label">Poster Image URL</label>
            <input
              className="input font-mono text-xs"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
            <p className="mt-1 text-xs text-ink-faint">Defaults to the event poster uploaded in the event details.</p>
          </div>

          {/* Custom Announcement Message */}
          <div>
            <label className="label">Custom Announcement Note / Highlights (Optional)</label>
            <textarea
              rows={3}
              className="input resize-y"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add special instructions, prerequisites, or highlight key guest speakers…"
            />
          </div>

          {/* Send Button */}
          <div className="pt-2">
            <button
              onClick={handleSendPoster}
              disabled={sending || (estimatedCount !== null && estimatedCount === 0)}
              className="flex items-center gap-2 border border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black disabled:opacity-50"
            >
              {sending ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
              {sending ? 'Dispatching Poster Emails…' : `Send Poster Email to ${estimatedCount ?? 0} Student(s)`}
            </button>
          </div>
        </div>
      </div>

      {/* Sending Result Card */}
      {sendingResult && (
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-navy-900 mb-4">Dispatch Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-navy-100 bg-white p-4 text-center">
              <p className="font-mono text-2xl font-bold text-navy-900">{sendingResult.totalRecipients || 0}</p>
              <p className="text-xs text-ink-muted">Total Audience</p>
            </div>
            <div className="rounded-xl border border-g-green/20 bg-g-green/5 p-4 text-center">
              <p className="font-mono text-2xl font-bold text-green-700">{sendingResult.successCount || 0}</p>
              <p className="text-xs text-green-600">Successfully Delivered</p>
            </div>
            <div className="rounded-xl border border-g-red/20 bg-g-red/5 p-4 text-center">
              <p className="font-mono text-2xl font-bold text-red-600">{sendingResult.failedCount || 0}</p>
              <p className="text-xs text-red-500">Failed</p>
            </div>
          </div>
        </div>
      )}

      {/* Audit & Dispatch History */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base font-bold text-navy-900">Email Delivery History &amp; Audit Log</h3>
          <button onClick={loadHistory} className="flex items-center gap-1 font-mono text-xs text-black/50 hover:text-black">
            <RefreshCw className={cn('h-3.5 w-3.5', loadingHistory && 'animate-spin')} /> Refresh
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-ink-muted italic">No poster email campaigns sent yet for this event.</p>
        ) : (
          <div className="space-y-4">
            {history.map((batch) => (
              <div key={batch.batchId} className="rounded-xl border border-navy-100 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-50 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-navy-900">{batch.batchId}</span>
                    <p className="text-xs text-ink-muted">{batch.subject}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-green-700 font-bold">{batch.successCount} sent</span>
                    {batch.failedCount > 0 && (
                      <span className="font-mono text-xs text-red-600 font-bold">{batch.failedCount} failed</span>
                    )}
                    {batch.failedCount > 0 && (
                      <button
                        onClick={() => handleRetryFailed(batch.batchId)}
                        disabled={retrying === batch.batchId}
                        className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 font-mono text-[11px] font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {retrying === batch.batchId ? <ButtonSpinner /> : <RefreshCw className="h-3 w-3" />}
                        Retry Failed
                      </button>
                    )}
                  </div>
                </div>

                {batch.recipients && batch.recipients.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-ink-muted border-b border-navy-50">
                          <th className="py-1">Recipient</th>
                          <th className="py-1">Email</th>
                          <th className="py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-50">
                        {batch.recipients.map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-1 font-medium text-navy-900">{r.name}</td>
                            <td className="py-1 font-mono text-ink-muted">{r.email}</td>
                            <td className="py-1">
                              {r.status === 'sent' ? (
                                <span className="text-green-600 font-semibold">Sent</span>
                              ) : (
                                <span className="text-red-500 font-semibold" title={r.errorMessage}>
                                  Failed: {r.errorMessage || 'Unknown error'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Poster Email Preview */}
      <div className="card p-6">
        <h3 className="font-display text-base font-bold text-navy-900 mb-4">Responsive Email Live Preview</h3>
        <div className="rounded-xl border border-navy-100 bg-white p-6">
          <div className="mx-auto max-w-md space-y-4">
            <div className="rounded-lg bg-navy-950 p-4 text-white">
              <h4 className="font-bold">GDGoC GCEE</h4>
              <p className="text-[10px] uppercase tracking-wider text-white/60">Government College of Engineering, Erode</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-navy-900">Dear Student,</p>
              <p className="text-xs text-ink-muted mt-1">We are excited to invite you to {event.title}!</p>
            </div>

            {posterUrl ? (
              <div className="overflow-hidden rounded-xl border border-navy-100">
                <img src={posterUrl} alt={event.title} className="w-full max-h-60 object-cover" />
              </div>
            ) : null}

            {customMessage && (
              <div className="rounded-lg border-l-4 border-g-blue bg-blue-50/50 p-3 text-xs text-blue-900">
                {customMessage}
              </div>
            )}

            <div className="rounded-lg border border-navy-100 p-3 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Event</span><span className="font-semibold text-navy-900">{event.title}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Date</span><span className="text-navy-900">{formatHumanDate(event.date) || 'TBA'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Time</span><span className="text-navy-900">{event.time || 'TBA'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Venue</span><span className="text-navy-900">{event.venue || 'TBA'}</span></div>
            </div>

            <div className="text-center pt-2">
              <a
                href={`https://gdgoc-gcee.vercel.app/events/${event.eventId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-lg bg-g-blue px-6 py-2.5 text-xs font-bold uppercase text-white shadow-md"
              >
                REGISTER NOW
              </a>
            </div>

            <p className="text-center text-[10px] leading-relaxed text-ink-muted pt-2 border-t border-navy-50">
              GDGoC GCEE Executive Committee · Government College of Engineering, Erode
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Registrations Tab ─────────────────────────────────────────────── */

function EventRegistrations({ eventId, event }: { eventId: string; event: GEvent }) {
  const [registrations, setRegistrations] = useState<EventRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sendingPdf, setSendingPdf] = useState(false);
  const [pdfResult, setPdfResult] = useState<{ sent: number; failed: number; total: number; failedEmails?: string[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '50' };
      if (search) params.search = search;
      const res = await api.get(`/admin/events/${eventId}/registrations`, { params });
      setRegistrations(res.data.registrations);
      setCount(res.data.total);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, page, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/admin/events/${eventId}/registrations/export`, { responseType: 'blob' });
      downloadBlob(res.data as Blob, `${eventId}-registrations.csv`);
      toast.success('CSV downloaded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const res = await api.get(`/admin/events/${eventId}/registration-list`, { responseType: 'blob' });
      downloadBlob(res.data as Blob, `${eventId}-registration-list.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSendPdf = async () => {
    setSendingPdf(true);
    setPdfResult(null);
    try {
      const res = await api.post(`/admin/events/${eventId}/send-pdf`);
      setPdfResult(res.data);
      toast.success(`PDF sent to ${res.data.sent} student(s)!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSendingPdf(false);
    }
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    try {
      await api.delete(`/admin/events/${eventId}/registrations/${registrationId}`);
      toast.success('Registration deleted.');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleClearAllRegistrations = async () => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to DELETE ALL ${count} registrations for "${event.title}"? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/admin/events/${eventId}/registrations/clear`);
      toast.success(res.data.message || 'All registrations cleared.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 rounded border border-black/10 bg-white p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-black/40" />
          <span className="font-mono text-sm font-bold">{count}</span>
          <span className="font-mono text-xs text-black/40">registered</span>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={handleClearAllRegistrations}
            disabled={count === 0}
            className="flex items-center gap-1.5 border border-red-200 bg-red-50 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-red-600 transition hover:bg-red-100 disabled:opacity-40"
            title="Delete all registration data for this event"
          >
            Clear All
          </button>
          <button
            onClick={handleSendPdf}
            disabled={sendingPdf || count === 0}
            className="flex items-center gap-1.5 border border-black bg-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            {sendingPdf ? 'Sending...' : 'Send PDF to All'}
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={generating || count === 0}
            className="flex items-center gap-1.5 border border-black/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black/60 transition hover:bg-black/5 disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" />
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={count === 0}
            className="flex items-center gap-1.5 border border-black/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black/60 transition hover:bg-black/5 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2.5">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, phone, roll..."
          className="w-full bg-transparent font-mono text-sm text-black placeholder:text-black/30 focus:outline-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader label="Loading registrations..." />
      ) : registrations.length === 0 ? (
        <div className="rounded border border-black/10 bg-white p-8 text-center font-mono text-sm text-black/40">
          No registrations found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 bg-white">
          {/* Send PDF result */}
          {pdfResult && (
            <div className="border-b border-black/5 bg-gray-50 px-4 py-3">
              <p className="font-mono text-xs">
                <span className="font-bold text-green-700">{pdfResult.sent} sent</span>
                {' · '}
                <span className="font-bold text-red-600">{pdfResult.failed} failed</span>
                {' · '}
                <span className="text-black/40">{pdfResult.total} total</span>
              </p>
              {pdfResult.failedEmails && pdfResult.failedEmails.length > 0 && (
                <p className="mt-1 text-[10px] text-red-500">{pdfResult.failedEmails.slice(0, 3).join(', ')}</p>
              )}
            </div>
          )}
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-gray-50">
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">#</th>
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Name</th>
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Email</th>
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Phone</th>
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Dept</th>
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Source</th>
                <th className="p-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {registrations.map((r, i) => (
                <tr key={r._id} className="transition hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-black/40">{(page - 1) * 50 + i + 1}</td>
                  <td className="p-3 font-semibold text-black">{r.name}</td>
                  <td className="p-3 font-mono text-xs text-black/60">{r.email}</td>
                  <td className="p-3 text-xs text-black/50">{r.phone || '—'}</td>
                  <td className="p-3 text-xs text-black/50">{r.department || '—'}</td>
                  <td className="p-3">
                    <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black/40">
                      {r.source}
                    </span>
                  </td>
                  <td className="p-3">
                    {deleteConfirm === r._id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteRegistration(r._id)}
                          className="rounded bg-red-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white transition hover:bg-red-700"
                        >Confirm</button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="font-mono text-[10px] text-black/40 hover:text-black"
                        >Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(r._id)}
                        className="rounded border border-red-200 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-red-500 transition hover:bg-red-50"
                      >Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {count > 50 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="border border-black/10 px-3 py-1.5 font-mono text-xs font-bold text-black/40 transition hover:text-black disabled:opacity-30"
          >
            <ChevronLeft className="inline h-4 w-4" /> Prev
          </button>
          <span className="font-mono text-xs text-black/40">Page {page} of {Math.ceil(count / 50)}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(count / 50)}
            className="border border-black/10 px-3 py-1.5 font-mono text-xs font-bold text-black/40 transition hover:text-black disabled:opacity-30"
          >
            Next <ChevronRight className="inline h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
