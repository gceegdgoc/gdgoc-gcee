import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Send, Users, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { cn } from '../../lib/utils';

interface Recipient {
  name: string;
  email: string;
}

interface EmailLog {
  _id: string;
  subject: string;
  sentBy: string;
  totalRecipients: number;
  successfulSends: number;
  failedSends: number;
  status: string;
  errorDetails: Array<{ email: string; error: string }>;
  sentAt: string | null;
  createdAt: string;
}

type Tab = 'compose' | 'logs';

export default function AdminBulkEmail() {
  const [tab, setTab] = useState<Tab>('compose');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [showHtml, setShowHtml] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; errors: Array<{ email: string; error: string }> } | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);

  useEffect(() => {
    loadRecipients();
  }, []);

  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab, logPage]);

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const res = await api.get('/admin/bulk-email/recipients');
      setRecipients(res.data.recipients);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/admin/bulk-email/logs', { params: { page: logPage, limit: 10 } });
      setLogs(res.data.logs);
      setTotalLogPages(res.data.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Please enter an email subject.');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter an email message.');
      return;
    }
    if (recipients.length === 0) {
      toast.error('No recipients available.');
      return;
    }

    const confirmed = window.confirm(
      `Send "${subject}" to ${recipients.length} students? This action cannot be undone.`
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/admin/bulk-email/send', {
        subject: subject.trim(),
        message: message.trim(),
        htmlContent: htmlContent.trim() || undefined,
      });
      setResult(res.data);
      toast.success(res.data.message);
      setSubject('');
      setMessage('');
      setHtmlContent('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Email"
        subtitle="Send emails to all registered students"
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-navy-200 bg-white p-1">
        <button
          onClick={() => setTab('compose')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition',
            tab === 'compose' ? 'bg-g-blue text-white shadow-sm' : 'text-ink-soft hover:bg-navy-50'
          )}
        >
          <Mail className="mr-2 inline h-4 w-4" />
          Compose
        </button>
        <button
          onClick={() => setTab('logs')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition',
            tab === 'logs' ? 'bg-g-blue text-white shadow-sm' : 'text-ink-soft hover:bg-navy-50'
          )}
        >
          <FileText className="mr-2 inline h-4 w-4" />
          Email Logs
        </button>
      </div>

      {tab === 'compose' && (
        <div className="space-y-6">
          {/* Recipients info */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {loadingRecipients ? 'Loading recipients…' : `${recipients.length} registered students`}
                </p>
                <p className="text-xs text-ink-muted">
                  All active students with valid email addresses will receive this email individually (no CC/BCC exposure).
                </p>
              </div>
            </div>
          </div>

          {/* Compose form */}
          <div className="card space-y-5 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-900">Email Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Update About Upcoming Workshop"
                maxLength={200}
                className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm focus:border-g-blue focus:outline-none focus:ring-1 focus:ring-g-blue"
              />
              <p className="mt-1 text-xs text-ink-faint">{subject.length}/200</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-900">Email Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message to students here…"
                rows={6}
                className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm focus:border-g-blue focus:outline-none focus:ring-1 focus:ring-g-blue"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowHtml(!showHtml)}
                className="text-xs font-medium text-g-blue hover:underline"
              >
                {showHtml ? 'Hide' : 'Show'} optional HTML content
              </button>
              {showHtml && (
                <div className="mt-2">
                  <label className="mb-1.5 block text-sm font-medium text-navy-900">Custom HTML (optional)</label>
                  <textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="<p>Custom HTML content here…</p>"
                    rows={6}
                    className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 font-mono text-xs focus:border-g-blue focus:outline-none focus:ring-1 focus:ring-g-blue"
                  />
                  <p className="mt-1 text-xs text-ink-faint">If provided, this replaces the default email template.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-navy-100 pt-4">
              <p className="text-sm text-ink-muted">
                Sending to <strong>{recipients.length}</strong> students
              </p>
              <button
                onClick={handleSend}
                disabled={sending || recipients.length === 0}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition',
                  sending || recipients.length === 0
                    ? 'cursor-not-allowed bg-navy-300'
                    : 'bg-g-blue hover:bg-blue-600'
                )}
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to All Students
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="card p-6">
              <h3 className="mb-3 text-sm font-semibold text-navy-900">Sending Complete</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-g-green/10 p-4 text-center">
                  <CheckCircle className="mx-auto mb-1 h-6 w-6 text-g-green" />
                  <p className="font-display text-2xl font-bold text-green-700">{result.sent}</p>
                  <p className="text-xs text-green-600">Sent</p>
                </div>
                <div className="rounded-xl bg-g-red/10 p-4 text-center">
                  <XCircle className="mx-auto mb-1 h-6 w-6 text-g-red" />
                  <p className="font-display text-2xl font-bold text-red-700">{result.failed}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-4 text-center">
                  <Users className="mx-auto mb-1 h-6 w-6 text-navy-500" />
                  <p className="font-display text-2xl font-bold text-navy-900">{result.total}</p>
                  <p className="text-xs text-ink-muted">Total</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="mb-2 text-xs font-semibold text-red-700">Failed deliveries:</p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">
                        {e.email}: {e.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          {loadingLogs ? (
            <PageLoader label="Loading email logs…" />
          ) : logs.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16">
              <Mail className="mb-3 h-8 w-8 text-ink-faint" />
              <p className="text-sm font-medium text-navy-900">No email logs yet</p>
              <p className="text-xs text-ink-muted">Bulk emails you send will appear here.</p>
            </div>
          ) : (
            <>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                      <th className="p-4 font-medium">Subject</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Recipients</th>
                      <th className="p-4 font-medium">Sent / Failed</th>
                      <th className="p-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {logs.map((log) => (
                      <tr key={log._id} className="transition hover:bg-navy-50/50">
                        <td className="p-4">
                          <p className="font-medium text-navy-900">{log.subject}</p>
                          <p className="text-xs text-ink-muted">by {log.sentBy}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              'chip',
                              log.status === 'completed' && 'bg-g-green/10 text-green-700',
                              log.status === 'partial' && 'bg-g-yellow/10 text-yellow-700',
                              log.status === 'sending' && 'bg-g-blue/10 text-blue-700'
                            )}
                          >
                            {log.status === 'sending' && <Clock className="mr-1 inline h-3 w-3" />}
                            {log.status === 'completed' && <CheckCircle className="mr-1 inline h-3 w-3" />}
                            {log.status === 'partial' && <XCircle className="mr-1 inline h-3 w-3" />}
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 text-ink-soft">{log.totalRecipients}</td>
                        <td className="p-4">
                          <span className="text-g-green font-medium">{log.successfulSends}</span>
                          {' / '}
                          <span className="text-g-red font-medium">{log.failedSends}</span>
                        </td>
                        <td className="p-4 text-xs text-ink-muted">
                          {log.sentAt
                            ? new Date(log.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalLogPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="btn-outline text-xs"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-ink-muted">
                    Page {logPage} of {totalLogPages}
                  </span>
                  <button
                    onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                    disabled={logPage === totalLogPages}
                    className="btn-outline text-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
