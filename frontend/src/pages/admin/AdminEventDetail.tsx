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
import type { GEvent } from '../../types';

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
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [confirmResend, setConfirmResend] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleSend = async (force = false) => {
    setSending(true);
    setResult(null);
    setProgress(null);
    let baseDone = 0;
    let total = 0;

    // Baseline + verified count so we can show "sent / total" progress while the batch runs.
    try {
      const [baseRes, countRes] = await Promise.all([
        api.get(`/admin/events/${event.eventId}/sending-history`, { params: { eventType: 'event-invite', limit: 1 } }),
        api.get(`/admin/events/${event.eventId}/verified-count`),
      ]);
      baseDone = (baseRes.data.stats?.sent || 0) + (baseRes.data.stats?.failed || 0);
      total = countRes.data.count || 0;
      setProgress({ done: 0, total });

      pollRef.current = setInterval(async () => {
        try {
          const cur = await api.get(`/admin/events/${event.eventId}/sending-history`, {
            params: { eventType: 'event-invite', limit: 1 },
          });
          const done = (cur.data.stats?.sent || 0) + (cur.data.stats?.failed || 0) - baseDone;
          setProgress({ done: Math.max(done, 0), total });
        } catch {
          /* ignore transient polling errors */
        }
      }, 1500);
    } catch (err) {
      console.warn('[sendEvent] progress polling setup failed', err);
      setProgress({ done: 0, total: 0 });
    }

    try {
      const res = await api.post(`/admin/events/${event.eventId}/send-to-all`, force ? { force: true } : {});
      stopPolling();
      setProgress(null);
      setResult(res.data);
      if (res.data.alreadySent && !force) {
        return;
      }
      toast.success(`Event email sent to ${res.data.sentCount} student(s)!`);
      if (res.data.failedCount > 0) {
        toast(`${res.data.failedCount} email(s) failed.`, {
          icon: '⚠️',
          style: { background: '#0b1b33', color: '#fde047' },
        });
      }
      onSent();
    } catch (err) {
      stopPolling();
      setProgress(null);
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Status Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-navy-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-g-blue" /> Send Event to All Students
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Send this event announcement to all verified students in the GDGoC GCEE community.
            </p>
          </div>
          {event.emailSent && (
            <span className="chip bg-g-green/10 text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Already Sent
            </span>
          )}
        </div>

        {event.emailSent && (
          <div className="mt-4 rounded-xl border border-g-green/20 bg-g-green/5 p-4">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">
                  Email sent to {event.emailSentCount} student(s)
                  {event.emailFailedCount ? `, ${event.emailFailedCount} failed` : ''}
                </p>
                <p className="text-xs text-green-600">
                  Sent on {event.emailSentAt ? new Date(event.emailSentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'unknown date'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-navy-100 bg-navy-50/50 p-4">
          <p className="text-xs font-semibold text-navy-700 mb-2">Email will contain:</p>
          <ul className="space-y-1 text-xs text-navy-600">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-g-green" /> GDGoC GCEE branding</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-g-green" /> Event name, description, date, time, venue</li>
            {event.banner && <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-g-green" /> Event poster image</li>}
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-g-green" /> "Register Now" button → {event.registrationLink || 'Official GDGoC GCEE event page'}</li>
          </ul>
        </div>

        {event.emailSent && !confirmResend ? (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setConfirmResend(true)}
              className="flex items-center gap-2 border border-g-yellow/50 bg-g-yellow/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-yellow-800 transition hover:bg-g-yellow/20"
            >
              <RefreshCw className="h-4 w-4" /> Send Again
            </button>
          </div>
        ) : event.emailSent && confirmResend ? (
          <div className="mt-5 rounded-xl border border-g-yellow/30 bg-g-yellow/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">Send event email again?</p>
                <p className="mt-1 text-xs text-yellow-700">
                  This will send the event email to all verified students again. Students may receive duplicate emails.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { handleSend(true); setConfirmResend(false); }}
                    disabled={sending}
                    className="flex items-center gap-1.5 border border-yellow-700 bg-yellow-700 px-4 py-1.5 font-mono text-[11px] font-bold uppercase text-white transition hover:bg-yellow-800 disabled:opacity-50"
                  >
                    {sending ? <ButtonSpinner /> : <Send className="h-3 w-3" />}
                    {sending ? 'Sending…' : 'Yes, send again'}
                  </button>
                  <button
                    onClick={() => setConfirmResend(false)}
                    className="font-mono text-[11px] text-yellow-700 hover:text-yellow-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => handleSend(false)}
              disabled={sending}
              className="flex items-center gap-2 border border-black bg-black px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black disabled:opacity-50"
            >
              {sending ? <ButtonSpinner /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send Event to All Students'}
            </button>
          </div>
        )}
      </div>

      {/* Sending Progress */}
      {progress && (
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-g-blue" />
            <div>
              <p className="font-display text-sm font-bold text-navy-900">Sending event email…</p>
              <p className="text-xs text-ink-muted">
                Progress: {progress.done} / {progress.total || '…'}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-navy-100">
            <div
              className="h-full rounded-full bg-g-blue transition-all duration-500"
              style={{ width: progress.total ? `${Math.min((progress.done / progress.total) * 100, 100)}%` : '5%' }}
            />
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            Sending individually to each verified student. Please keep this tab open.
          </p>
        </div>
      )}

      {/* Sending Result */}
      {result && !result.alreadySent && (
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-navy-900 mb-4">Sending Result</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-navy-100 bg-white p-4 text-center">
              <p className="font-mono text-2xl font-bold text-navy-900">{result.totalRecipients || 0}</p>
              <p className="text-xs text-ink-muted">Total Recipients</p>
            </div>
            <div className="rounded-xl border border-g-green/20 bg-g-green/5 p-4 text-center">
              <p className="font-mono text-2xl font-bold text-green-700">{result.sentCount || 0}</p>
              <p className="text-xs text-green-600">Successfully Sent</p>
            </div>
            <div className="rounded-xl border border-g-red/20 bg-g-red/5 p-4 text-center">
              <p className="font-mono text-2xl font-bold text-red-600">{result.failedCount || 0}</p>
              <p className="text-xs text-red-500">Failed</p>
            </div>
          </div>
          {result.failedEmails && result.failedEmails.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-700 mb-2">Failed emails (admin only):</p>
              <p className="text-[11px] text-red-600 break-all">{result.failedEmails.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="card p-6">
        <h3 className="font-display text-base font-bold text-navy-900 mb-4">Email Preview</h3>
        <div className="rounded-xl border border-navy-100 bg-white p-6">
          <div className="mx-auto max-w-md space-y-4">
            <div className="rounded-lg bg-navy-950 p-4 text-white">
              <h4 className="font-bold">GDGoC GCEE</h4>
              <p className="text-[10px] uppercase tracking-wider text-white/60">Google Developer Groups on Campus</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">You're Invited!</p>
              <p className="text-sm text-ink-muted">We are excited to announce an upcoming event.</p>
            </div>
            {event.banner && (
              <div className="overflow-hidden rounded-lg">
                <img src={event.banner} alt={event.title} className="w-full h-32 object-cover" />
              </div>
            )}
            <div className="rounded-lg border border-navy-100 p-3 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Event</span><span className="font-semibold text-navy-900">{event.title || 'Event Name'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Date</span><span className="text-navy-900">{formatHumanDate(event.date) || 'TBA'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Time</span><span className="text-navy-900">{event.startTime || 'TBA'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-muted">Venue</span><span className="text-navy-900">{event.venue || 'TBA'}</span></div>
            </div>
            <div className="text-center">
              <span className="inline-block rounded-lg bg-g-blue px-6 py-2 text-xs font-bold text-white">REGISTER NOW</span>
            </div>
            <p className="text-center text-[10px] text-ink-muted">GDGoC GCEE Team · Government College of Engineering, Erode</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Registrations Tab ─────────────────────────────────────────────── */

function EventRegistrations({ eventId, event }: { eventId: string; event: GEvent }) {
  const [registrations, setRegistrations] = useState<any[]>([]);
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
        {event.capacity > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-black/40">Capacity: {event.capacity}</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full bg-black transition-all"
                style={{ width: `${Math.min((count / event.capacity) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
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
