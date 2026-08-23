import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Mail, User, Clock, CheckCircle2, Inbox } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ContactMsg {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMsg | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Use form-registrations as fallback if contact messages endpoint not yet implemented
      const res = await api.get('/admin/form-registrations');
      setMessages(res.data.registrations || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle={`Contact messages from the GDGoC GCEE website.${unread > 0 ? ` ${unread} unread.` : ''}`}
      />

      {loading ? (
        <PageLoader label="Loading messages…" />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-7 w-7" />}
          title="No messages yet"
          description="When visitors send a message from the Contact page, they will appear here."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Message list */}
          <div className="card overflow-hidden">
            <div className="border-b border-navy-50 p-4">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900">
                <MessageSquare className="h-4 w-4 text-g-blue" />
                Inbox
                {unread > 0 && (
                  <span className="chip bg-g-blue/10 text-g-blue font-bold">{unread}</span>
                )}
              </h3>
            </div>
            <div className="divide-y divide-navy-50 overflow-y-auto max-h-[560px]">
              {messages.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => setSelected(msg)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition hover:bg-navy-50/60',
                    selected?._id === msg._id && 'bg-g-blue/5 border-l-2 border-g-blue'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn('truncate text-sm font-semibold', !msg.isRead ? 'text-navy-900' : 'text-ink-muted')}>
                        {msg.name || 'Unknown'}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{msg.subject || msg.email || '—'}</p>
                    </div>
                    {!msg.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-g-blue" />
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-faint">
                    <Clock className="h-3 w-3" />
                    {formatDate(msg.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Message detail */}
          {selected ? (
            <div className="card p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-900">{selected.subject || 'No subject'}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" /> {selected.name}
                    </span>
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-g-blue hover:underline">
                      <Mail className="h-4 w-4" /> {selected.email}
                    </a>
                    <span className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5" /> {formatDate(selected.createdAt)}
                    </span>
                  </div>
                </div>
                {selected.isRead ? (
                  <span className="chip bg-navy-50 text-ink-faint">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Read
                  </span>
                ) : (
                  <span className="chip bg-g-blue/10 text-g-blue font-bold">New</span>
                )}
              </div>
              <div className="h-px bg-navy-100" />
              <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {selected.message || '(No message content)'}
              </div>
              <div className="mt-8 flex gap-3">
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}
                  className="btn-primary"
                >
                  <Mail className="h-4 w-4" /> Reply via Email
                </a>
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center p-12 text-center text-ink-muted">
              <div>
                <MessageSquare className="mx-auto h-10 w-10 text-ink-faint" />
                <p className="mt-3 text-sm font-medium">Select a message to view it</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
