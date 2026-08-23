import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CalendarX2, ExternalLink, Users, MailCheck, MailX, Eye, Send } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/Badge';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate, cn, downloadBlob, getEffectiveEventStatus } from '../../lib/utils';
import type { GEvent } from '../../types';

export default function AdminEvents() {
  const [events, setEvents] = useState<GEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data.events);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (eventId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This will also remove its registrations.`)) return;
    try {
      const res = await api.delete(`/admin/events/${eventId}`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleExportCsv = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/admin/events/${eventId}/registrations/export`, { responseType: 'blob' });
      downloadBlob(res.data as Blob, `${eventId}-registrations.csv`);
      toast.success('CSV downloaded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleToggleStatus = async (eventId: string, currentStatus: string, title: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'UPCOMING' : 'COMPLETED';
    const actionLabel = currentStatus === 'COMPLETED' ? 'reopen' : 'mark as completed';
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${title}"?`)) return;

    try {
      const res = await api.patch(`/admin/events/${eventId}/status`, { status: nextStatus });
      toast.success(res.data.message || `Event marked as ${nextStatus}.`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const totalUpcoming = events.filter((e) => {
    const s = getEffectiveEventStatus(e);
    return s === 'UPCOMING' || s === 'ONGOING';
  }).length;
  const totalCompleted = events.filter((e) => getEffectiveEventStatus(e) === 'COMPLETED').length;
  const totalRegistrations = events.reduce((acc, e) => acc + (e.registeredCount || 0) + (e.manualRegistrationCount || 0), 0);
  const filtered = filter === 'ALL' ? events : events.filter((e) => getEffectiveEventStatus(e) === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle={`${events.length} total events · ${totalUpcoming} active · ${totalRegistrations} total registrations`}
        actions={
          <Link to="/admin/events/create" className="border border-black bg-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black">
            <Plus className="mr-1 inline h-4 w-4" /> Create event
          </Link>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-navy-100 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Total Events</p>
          <p className="mt-1 font-mono text-2xl font-bold text-navy-900">{events.length}</p>
        </div>
        <div className="rounded-xl border border-g-blue/20 bg-g-blue/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-g-blue">Upcoming / Active</p>
          <p className="mt-1 font-mono text-2xl font-bold text-g-blue">{totalUpcoming}</p>
        </div>
        <div className="rounded-xl border border-g-green/20 bg-g-green/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Completed</p>
          <p className="mt-1 font-mono text-2xl font-bold text-green-700">{totalCompleted}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Registrations</p>
          <p className="mt-1 font-mono text-2xl font-bold text-navy-900">{totalRegistrations}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all',
              filter === f
                ? 'bg-black text-white'
                : 'border border-black/10 bg-white text-black/50 hover:border-black/30 hover:text-black'
            )}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="Loading events..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 className="h-7 w-7" />}
          title="No events found"
          description="Create your first event to get started."
          action={
            <Link to="/admin/events/create" className="border border-black bg-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black">
              <Plus className="mr-1 inline h-4 w-4" /> Create event
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-gray-50">
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Event</th>
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Date</th>
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Category</th>
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Registrations</th>
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Email</th>
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Status</th>
                <th className="p-4 font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((ev) => {
                const currentStatus = getEffectiveEventStatus(ev);
                const isCompleted = currentStatus === 'COMPLETED';
                return (
                  <tr key={ev._id} className="transition hover:bg-gray-50">
                    <td className="max-w-[220px] p-4">
                      <p className="truncate font-semibold text-black">{ev.title}</p>
                      <p className="font-mono text-[11px] text-black/30">{ev.eventId}</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-black/50">{formatHumanDate(ev.date)}</td>
                    <td className="p-4">
                      <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black/40">
                        {ev.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-black/30" />
                        <span className="font-mono text-sm font-bold">{ev.registeredCount}</span>
                        {ev.capacity > 0 && (
                          <span className="font-mono text-xs text-black/30">/ {ev.capacity}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {ev.emailSent ? (
                        <div className="flex items-center gap-1.5 text-green-700">
                          <MailCheck className="h-3.5 w-3.5" />
                          <span className="font-mono text-xs">Sent ({ev.emailSentCount || 0})</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-black/20">
                          <MailX className="h-3.5 w-3.5" />
                          <span className="font-mono text-xs">Not sent</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4"><StatusBadge status={currentStatus} /></td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(ev.eventId, currentStatus, ev.title)}
                          className={cn(
                            'rounded border px-2 py-1 font-mono text-[11px] font-semibold transition',
                            isCompleted
                              ? 'border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                              : 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
                          )}
                          title={isCompleted ? 'Reopen event registration' : 'Mark event as completed'}
                        >
                          {isCompleted ? 'Reopen' : 'Complete'}
                        </button>
                        <Link
                          to={`/admin/events/${ev.eventId}?tab=email`}
                          className="rounded border border-g-blue/30 bg-g-blue/5 px-2 py-1 font-mono text-[11px] font-semibold text-g-blue transition hover:bg-g-blue hover:text-white"
                          title="Send Registration Link to Members"
                        >
                          <Send className="mr-1 inline h-3 w-3" /> Send Link
                        </Link>
                        <Link
                          to={`/admin/events/${ev.eventId}?tab=registrations`}
                          className="rounded border border-black/10 bg-white px-2 py-1 font-mono text-[11px] font-semibold text-black/70 transition hover:bg-black/5 hover:text-black"
                          title="View Registrations"
                        >
                          <Users className="mr-1 inline h-3 w-3" /> Registrations
                        </Link>
                        <button
                          onClick={(e) => handleExportCsv(ev.eventId, e)}
                          className="rounded border border-black/10 bg-white px-2 py-1 font-mono text-[11px] font-semibold text-black/70 transition hover:bg-black/5 hover:text-black"
                          title="Export CSV"
                        >
                          CSV
                        </button>
                        <Link
                          to={`/admin/events/${ev.eventId}?tab=details`}
                          className="rounded p-1.5 text-black/40 transition hover:bg-black/5 hover:text-black"
                          title="Edit event"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => remove(ev.eventId, ev.title)}
                          className="rounded p-1.5 text-black/40 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
