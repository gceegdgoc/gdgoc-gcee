import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Award,
  ShieldX,
  ShieldCheck,
  Download,
  Link2,
  Send,
  Plus,
  Sparkles,
  Eye,
  FileDown,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { CertificatePreview } from '../../components/admin/CertificatePreview';
import { api, getErrorMessage, downloadPdf } from '../../lib/api';
import { cn, formatDotDate } from '../../lib/utils';

interface Row {
  certificateId: string;
  studentName: string;
  studentEmail: string;
  campaignName?: string;
  eventName?: string;
  eventDate?: string;
  eventDateLabel?: string;
  issueDate: string;
  status: string;
}

interface EventOption {
  eventId: string;
  title: string;
  date: string;
}

export default function AdminCertificates() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  // Generator Modal State
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [eventName, setEventName] = useState('AI Prompt Engineering Workshop');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [sendEmail, setSendEmail] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPreview, setDownloadingPreview] = useState(false);

  // View Certificate Modal State
  const [viewCert, setViewCert] = useState<Row | null>(null);

  // Email resending state
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/certificates', {
        params: filter !== 'ALL' ? { status: filter } : {},
      });
      setRows(res.data.certificates);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      if (res.data.events) {
        setEvents(res.data.events);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    load();
    loadEvents();
  }, [filter]);

  const handleSelectEvent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = events.find((ev) => ev.title === e.target.value);
    if (selected) {
      setEventName(selected.title);
      if (selected.date) {
        setEventDate(selected.date.slice(0, 10));
      }
    }
  };

  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast.error('Please enter the student name.');
      return;
    }
    if (!eventName.trim()) {
      toast.error('Please enter the event name.');
      return;
    }
    if (!eventDate) {
      toast.error('Please select the event date.');
      return;
    }
    if (sendEmail && !studentEmail.trim()) {
      toast.error('Please enter the student email to send the certificate.');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/admin/certificates/quick-generate', {
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
        eventName: eventName.trim(),
        eventDate,
        sendEmail,
      });

      toast.success(res.data.message || 'Certificate generated successfully!');
      setGenModalOpen(false);
      setStudentName('');
      setStudentEmail('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewPdf = async () => {
    setDownloadingPreview(true);
    try {
      const res = await api.post(
        '/admin/certificates/preview-pdf',
        {
          studentName: studentName.trim() || 'Student Name',
          eventName: eventName.trim() || 'AI Prompt Engineering Workshop',
          eventDate: eventDate || new Date().toISOString().slice(0, 10),
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingPreview(false);
    }
  };

  const handleResendEmail = async (cert: Row) => {
    const email = window.prompt(
      `Send certificate ${cert.certificateId} to student email:`,
      cert.studentEmail || ''
    );
    if (!email) return;

    setResendingId(cert.certificateId);
    try {
      const res = await api.post(`/admin/certificates/${cert.certificateId}/send-email`, {
        email: email.trim(),
      });
      toast.success(res.data.message || 'Certificate email sent!');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResendingId(null);
    }
  };

  const revoke = async (id: string, name: string) => {
    const reason = window.prompt(`Revoke certificate for ${name}? Enter a reason (optional):`) ?? '';
    if (reason === null) return;
    try {
      const res = await api.post(`/admin/certificates/${id}/revoke`, { reason });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const restore = async (id: string) => {
    try {
      const res = await api.post(`/admin/certificates/${id}/restore`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const valid = rows.filter((r) => r.status === 'VALID').length;

  // Format label for live preview
  const formattedEventDate = (() => {
    if (!eventDate) return '18 August 2026';
    try {
      const d = new Date(`${eventDate.slice(0, 10)}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return eventDate;
      return d.toLocaleDateString('en-IN', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return eventDate;
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Certificates" subtitle={`${rows.length} shown · ${valid} valid`} />

        <button
          onClick={() => setGenModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <Sparkles className="h-4 w-4 text-yellow-300" />
          <span>Generate &amp; Send Certificate</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'VALID', 'REVOKED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-all',
              filter === f ? 'bg-navy-900 text-white' : 'border border-navy-100 bg-white text-ink-soft hover:text-navy-900'
            )}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="Loading certificates…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Award className="h-7 w-7" />}
          title="No certificates yet"
          description="Click 'Generate & Send Certificate' to create an attractive certificate for a student."
          action={
            <button onClick={() => setGenModalOpen(true)} className="btn-primary mt-2">
              <Plus className="h-4 w-4 mr-1.5 inline" /> Generate First Certificate
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-4 font-medium">Certificate</th>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Event Name</th>
                <th className="p-4 font-medium">Event Date</th>
                <th className="p-4 font-medium">Issued</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {rows.map((c) => (
                <tr key={c.certificateId} className={cn('transition hover:bg-navy-50/50', c.status === 'REVOKED' && 'opacity-70')}>
                  <td className="p-4 font-mono text-xs font-semibold text-navy-900">
                    <button
                      onClick={() => setViewCert(c)}
                      className="text-g-blue hover:underline font-mono"
                      title="Click to preview"
                    >
                      {c.certificateId}
                    </button>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-navy-900">{c.studentName}</p>
                    {c.studentEmail && <p className="text-xs text-ink-muted">{c.studentEmail}</p>}
                  </td>
                  <td className="p-4 font-medium text-navy-900">{c.eventName || c.campaignName || '—'}</td>
                  <td className="p-4 text-ink-soft">{c.eventDateLabel || (c.eventDate ? formatDotDate(c.eventDate) : '—')}</td>
                  <td className="p-4 text-ink-soft">{formatDotDate(c.issueDate)}</td>
                  <td className="p-4">
                    <span className={cn('chip', c.status === 'VALID' ? 'bg-g-green/10 text-green-700' : 'bg-g-red/10 text-g-red')}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setViewCert(c)}
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-navy-100 hover:text-navy-900"
                        title="View Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResendEmail(c)}
                        disabled={resendingId === c.certificateId}
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-g-blue/10 hover:text-g-blue disabled:opacity-50"
                        title="Send / Resend Email with PDF"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                      <a
                        href={`/certificate/${c.certificateId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-g-blue/10 hover:text-g-blue"
                        title="Public verification page"
                      >
                        <Link2 className="h-4 w-4" />
                      </a>
                      {c.status === 'VALID' && (
                        <button
                          onClick={() => downloadPdf(c.certificateId)}
                          className="rounded-lg p-2 text-ink-soft transition hover:bg-g-green/10 hover:text-green-700"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      {c.status === 'VALID' ? (
                        <button onClick={() => revoke(c.certificateId, c.studentName)} className="rounded-lg p-2 text-ink-soft transition hover:bg-g-red/10 hover:text-g-red" title="Revoke">
                          <ShieldX className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => restore(c.certificateId)} className="rounded-lg p-2 text-ink-soft transition hover:bg-g-green/10 hover:text-green-700" title="Restore to valid">
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── GENERATE & SEND CERTIFICATE MODAL ────────────────────── */}
      <Modal
        open={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        title="✨ Generate & Send Certificate"
        wide
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1">
          {/* Form Column */}
          <form onSubmit={handleQuickGenerate} className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1">
                Event Name *
              </label>
              {events.length > 0 && (
                <div className="mb-2">
                  <select
                    onChange={handleSelectEvent}
                    className="w-full text-xs rounded-lg border border-navy-200 bg-navy-50/50 p-2 text-navy-800"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      ⚡ Pick from recent events…
                    </option>
                    {events.map((ev) => (
                      <option key={ev.eventId} value={ev.title}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. AI Prompt Engineering Workshop"
                required
                className="input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1">
                Event Date *
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="input text-sm"
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                Rendered on certificate as: <strong className="text-navy-900">{formattedEventDate}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1">
                Student Name *
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Hariesh V"
                required
                className="input text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1">
                Student Email (for Delivery)
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="e.g. student@gmail.com"
                className="input text-sm"
              />
            </div>

            <div className="rounded-lg border border-navy-100 bg-slate-50 p-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-navy-900">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded text-g-blue focus:ring-g-blue h-4 w-4"
                />
                <span>Send certificate email with PDF attachment to student</span>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePreviewPdf}
                disabled={downloadingPreview}
                className="btn-outline flex-1 text-xs py-2.5 inline-flex items-center justify-center gap-1.5"
              >
                {downloadingPreview ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
                <span>Download Sample PDF</span>
              </button>

              <button
                type="submit"
                disabled={generating}
                className="btn-primary flex-1 text-xs py-2.5 inline-flex items-center justify-center gap-1.5"
              >
                {generating ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                <span>{sendEmail ? 'Generate & Send Email' : 'Generate Certificate'}</span>
              </button>
            </div>
          </form>

          {/* Live Preview Column */}
          <div className="lg:col-span-7 flex flex-col justify-center bg-slate-100 p-4 rounded-xl border border-slate-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Certificate Preview
              </span>
              <span className="text-[11px] text-slate-500">
                High-Resolution Vector Design
              </span>
            </div>
            <CertificatePreview
              data={{
                participantName: studentName || 'Student Name',
                eventName: eventName || 'AI Prompt Engineering Workshop',
                eventDateLabel: formattedEventDate,
                certificateId: 'GDGCEE-PREVIEW-001',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* ── VIEW CERTIFICATE PREVIEW MODAL ───────────────────────── */}
      <Modal
        open={!!viewCert}
        onClose={() => setViewCert(null)}
        title={`Certificate: ${viewCert?.certificateId}`}
        wide
      >
        {viewCert && (
          <div className="space-y-4 p-1">
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
              <CertificatePreview
                data={{
                  participantName: viewCert.studentName,
                  eventName: viewCert.eventName || viewCert.campaignName || 'GDGoC GCEE Event',
                  eventDateLabel: viewCert.eventDateLabel || formatDotDate(viewCert.eventDate || viewCert.issueDate),
                  certificateId: viewCert.certificateId,
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-ink-muted">
                Issued on: <strong>{formatDotDate(viewCert.issueDate)}</strong> · Status:{' '}
                <strong className={viewCert.status === 'VALID' ? 'text-green-600' : 'text-red-600'}>
                  {viewCert.status}
                </strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResendEmail(viewCert)}
                  className="btn-outline text-xs py-2 inline-flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Send Email
                </button>
                <button
                  onClick={() => downloadPdf(viewCert.certificateId)}
                  className="btn-primary text-xs py-2 inline-flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
