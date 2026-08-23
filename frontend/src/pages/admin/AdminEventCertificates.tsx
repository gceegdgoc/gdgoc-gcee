import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCheck,
  UserX,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { CertificatePreview, type CertificatePreviewData } from '../../components/admin/CertificatePreview';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate, formatDotDate, cn } from '../../lib/utils';
import { downloadPdf } from '../../lib/utils';
import type { EventParticipant, GEvent } from '../../types';

interface EventCert {
  certificateId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  eventName: string;
  eventDateLabel: string;
  status: 'VALID' | 'REVOKED';
  qrCode?: string;
  issuedBy?: string;
}

export default function AdminEventCertificates() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<GEvent | null>(null);
  const [events, setEvents] = useState<GEvent[]>([]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [certs, setCerts] = useState<EventCert[]>([]);
  const [stats, setStats] = useState({ total: 0, participated: 0, notParticipated: 0, certified: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PARTICIPATED' | 'NOT_PARTICIPATED'>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ data: CertificatePreviewData; studentId: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const load = async (keepSelection = false) => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/admin/events/${eventId}/participants`),
        api.get(`/admin/events/${eventId}/certificates`),
      ]);
      setEvent(pRes.data.event);
      setParticipants(pRes.data.participants);
      setStats(pRes.data.stats);
      setCerts(cRes.data.certificates);
      if (!keepSelection) setSelected(new Set());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data.events || []);
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    load();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participants.filter((p) => {
      if (filter === 'PARTICIPATED' && p.participation !== 'PARTICIPATED') return false;
      if (filter === 'NOT_PARTICIPATED' && p.participation !== 'NOT_PARTICIPATED') return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.rollNumber || '').toLowerCase().includes(q) ||
        p.registrationId.toLowerCase().includes(q)
      );
    });
  }, [participants, search, filter]);

  const selectedList = participants.filter((p) => selected.has(p.studentId));
  const selectable = filteredParticipants.filter(
    (p) => p.participation === 'PARTICIPATED' && p.certificate?.status !== 'VALID'
  );

  const toggleSelect = (studentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const markParticipation = async (studentId: string, participated: boolean) => {
    try {
      await api.post(`/admin/events/${eventId}/participation`, {
        entries: [{ studentId, participated }],
      });
      toast.success(participated ? 'Marked as participated.' : 'Marked as not participated.');
      load(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const generateFor = async (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setBusy(true);
    try {
      setPreview(null);
      const res = await api.post(`/admin/events/${eventId}/certificates/generate`, { studentIds });
      toast.success(res.data.message);
      if (res.data.skipped?.length) {
        toast(`Skipped: ${res.data.skipped.map((s: any) => s.reason).join('; ')}`);
      }
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async (p: EventParticipant) => {
    setPreviewLoading(p.studentId);
    try {
      const res = await api.post(`/admin/events/${eventId}/certificates/preview`, { studentId: p.studentId });
      setPreview(res.data.preview);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPreviewLoading(null);
    }
  };

  const revokeCert = async (cert: EventCert) => {
    const reason = window.prompt(`Revoke certificate ${cert.certificateId} for ${cert.studentName}? Reason (optional):`) ?? '';
    if (reason === null) return;
    try {
      await api.post(`/admin/certificates/${cert.certificateId}/revoke`, { reason });
      toast.success('Certificate revoked.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const restoreCert = async (cert: EventCert) => {
    try {
      await api.post(`/admin/certificates/${cert.certificateId}/restore`);
      toast.success('Certificate restored to VALID.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteCert = async (cert: EventCert) => {
    if (!window.confirm(`Permanently delete certificate ${cert.certificateId}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/events/${eventId}/certificates/${cert.certificateId}`);
      toast.success('Certificate deleted.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading && !event) return <PageLoader label="Loading certificate management…" />;
  if (!event) return <div className="text-ink-muted">Event not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Management"
        subtitle={event ? `${event.eventId} — ${event.title}` : ''}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={eventId}
              onChange={(e) => navigate(`/admin/events/${e.target.value}/certificates`)}
              className="input !w-auto !py-2 text-sm"
            >
              {events.map((e) => (
                <option key={e.eventId} value={e.eventId}>
                  {e.title} · {formatHumanDate(e.date)}
                </option>
              ))}
            </select>
            <Link to={`/admin/events/${eventId}`} className="btn-outline">
              <ArrowLeft className="h-4 w-4" /> Event
            </Link>
          </div>
        }
      />

      {/* Event info + stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Registered" value={String(stats.total)} />
        <Stat label="Participated" value={String(stats.participated)} accent="text-green-700" />
        <Stat label="Not participated" value={String(stats.notParticipated)} accent="text-g-red" />
        <Stat label="Certificates issued" value={String(stats.certified)} accent="text-g-blue" />
      </div>

      {/* Toolbar */}
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, roll, registration ID…"
              className="input !pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(['ALL', 'PARTICIPATED', 'NOT_PARTICIPATED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  filter === f ? 'bg-navy-900 text-white' : 'border border-navy-100 bg-white text-ink-soft hover:text-navy-900'
                )}
              >
                {f === 'ALL' ? 'All' : f === 'PARTICIPATED' ? 'Participated' : 'Not participated'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => load()} className="btn-outline !py-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => generateFor([...selected])}
            disabled={selectedList.length === 0 || busy}
            className="btn-primary !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <ButtonSpinner /> : <Sparkles className="h-3.5 w-3.5" />}
            {selectedList.length ? `Generate selected (${selectedList.length})` : 'Generate selected'}
          </button>
        </div>
      </div>

      {/* Participants table */}
      <div className="card overflow-hidden">
        <div className="border-b border-navy-50 px-5 py-4">
          <h3 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-g-blue" /> Registered students
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Only students registered for this event are listed. Mark participation then generate certificates.
          </p>
        </div>

        {loading ? (
          <PageLoader label="Loading participants…" />
        ) : filteredParticipants.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">No registered students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                  <th className="p-3 pl-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#34A853]"
                      checked={selectable.length > 0 && selectedList.filter((p) => p.participation === 'PARTICIPATED').length === selectable.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(selectable.map((p) => p.studentId)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 font-medium">Student</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Registered</th>
                  <th className="p-3 font-medium">Participation</th>
                  <th className="p-3 font-medium">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filteredParticipants.map((p) => {
                  const hasValidCert = p.certificate?.status === 'VALID';
                  const disabled = p.participation !== 'PARTICIPATED';
                  return (
                    <tr key={p.registrationId} className={cn('transition hover:bg-navy-50/30', disabled && !hasValidCert && 'opacity-70')}>
                      <td className="p-3 pl-5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#34A853]"
                          checked={selected.has(p.studentId)}
                          disabled={disabled || hasValidCert}
                          onChange={() => toggleSelect(p.studentId)}
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-navy-900">{p.name}</p>
                        <p className="font-mono text-[11px] text-ink-faint">{p.rollNumber || p.registrationId.slice(-6).toUpperCase()}</p>
                      </td>
                      <td className="p-3 font-mono text-xs text-ink-soft">{p.email}</td>
                      <td className="p-3">
                        <span className="chip bg-g-green/10 text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Yes
                        </span>
                      </td>
                      <td className="p-3">
                        {p.participation === 'PARTICIPATED' ? (
                          <span className="chip bg-g-green/10 text-green-700">Participated</span>
                        ) : (
                          <span className="chip bg-slate-100 text-slate-500">Not Participated</span>
                        )}
                        <button
                          onClick={() => markParticipation(p.studentId, p.participation !== 'PARTICIPATED')}
                          className="ml-2 rounded border border-navy-100 px-2 py-0.5 text-[10px] font-semibold text-navy-700 transition hover:bg-navy-50"
                          title={p.participation === 'PARTICIPATED' ? 'Mark as not participated' : 'Mark as participated'}
                        >
                          {p.participation === 'PARTICIPATED' ? <UserX className="mr-1 inline h-3 w-3" /> : <UserCheck className="mr-1 inline h-3 w-3" />}
                          {p.participation === 'PARTICIPATED' ? 'Undo' : 'Mark'}
                        </button>
                      </td>
                      <td className="p-3">
                        {hasValidCert ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-navy-900">{p.certificate?.certificateId}</span>
                            <a
                              href={`/certificate/${p.certificate?.certificateId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1 text-ink-muted transition hover:bg-g-blue/10 hover:text-g-blue"
                              title="Verify"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => p.certificate && downloadPdf(p.certificate.certificateId)}
                              className="rounded-lg p-1 text-ink-muted transition hover:bg-g-green/10 hover:text-green-700"
                              title="Download PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : p.certificate?.status === 'REVOKED' ? (
                          <span className="chip bg-g-red/10 text-g-red">Revoked</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => showPreview(p)}
                              disabled={!!previewLoading}
                              className="rounded-md border border-navy-100 px-2 py-1 text-[10px] font-semibold text-g-blue transition hover:bg-g-blue/10"
                            >
                              <Eye className="mr-1 inline h-3 w-3" /> Preview
                            </button>
                            <button
                              onClick={() => generateFor([p.studentId])}
                              disabled={disabled || busy}
                              className="rounded-md border border-black bg-black px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              Generate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issued certificates */}
      {certs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-navy-50 px-5 py-4">
            <h3 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-g-yellow" /> Issued certificates ({certs.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                  <th className="p-3 pl-5 font-medium">Certificate ID</th>
                  <th className="p-3 font-medium">Student</th>
                  <th className="p-3 font-medium">Event date</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {certs.map((c) => (
                  <tr key={c.certificateId} className={cn('transition hover:bg-navy-50/30', c.status === 'REVOKED' && 'opacity-60')}>
                    <td className="p-3 pl-5 font-mono text-xs font-semibold text-navy-900">{c.certificateId}</td>
                    <td className="p-3">
                      <p className="font-semibold text-navy-900">{c.studentName}</p>
                      <p className="text-xs text-ink-muted">{c.studentEmail}</p>
                    </td>
                    <td className="p-3 text-ink-soft">{c.eventDateLabel || '—'}</td>
                    <td className="p-3">
                      <span className={cn('chip', c.status === 'VALID' ? 'bg-g-green/10 text-green-700' : 'bg-g-red/10 text-g-red')}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/certificate/${c.certificateId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-1.5 text-ink-muted transition hover:bg-g-blue/10 hover:text-g-blue"
                          title="Verify page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {c.status === 'VALID' && (
                          <button
                            onClick={() => downloadPdf(c.certificateId)}
                            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-g-green/10 hover:text-green-700"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        {c.status === 'VALID' ? (
                          <button
                            onClick={() => revokeCert(c)}
                            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-g-red/10 hover:text-g-red"
                            title="Revoke"
                          >
                            <ShieldX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => restoreCert(c)}
                            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-g-green/10 hover:text-green-700"
                            title="Restore to valid"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteCert(c)}
                          className="rounded-lg p-1.5 text-ink-muted transition hover:bg-g-red/10 hover:text-g-red"
                          title="Delete permanently"
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
        </div>
      )}

      {/* Certificate preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Certificate Preview" wide>
        {preview && (
          <div>
            <CertificatePreview data={preview.data} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">
                This is how the generated certificate will look. Download uses the same design as a high-resolution PDF.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)} className="btn-outline">Close</button>
                <button onClick={() => generateFor([preview.data.participantName !== '' ? selectedList[0]?.studentId || '' : ''])} disabled={!selectedList[0]} className="btn-primary">
                  <Sparkles className="h-4 w-4" /> Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn('mt-1.5 font-display text-2xl font-bold text-navy-900', accent)}>{value}</p>
    </div>
  );
}