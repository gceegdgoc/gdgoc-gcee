import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, MapPin, Clock, Ticket, ArrowRight, Award, Sparkles } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/Badge';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate } from '../../lib/utils';
import type { GEvent } from '../../types';

export default function MyEvents() {
  const [events, setEvents] = useState<GEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/events/my/registered')
      .then((res) => mounted && setEvents(res.data.events))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const cancel = async (eventId: string) => {
    setBusyId(eventId);
    try {
      const res = await api.delete(`/events/${eventId}/register`);
      toast.success(res.data.message);
      setEvents((evs) => evs.filter((e) => e.eventId !== eventId));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageLoader label="Loading your events…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">My Events</h1>
        <p className="mt-1 text-sm text-ink-muted">Events you are registered for.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-7 w-7" />}
          title="No registered events"
          description="Browse available events and register to start your journey."
          action={<Link to="/events" className="btn-primary">Explore events</Link>}
        />
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <div key={ev._id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-white">
                <span className="font-display text-lg font-bold leading-none">{formatHumanDate(ev.date).split(' ')[1]?.slice(0, 2)}</span>
                <span className="text-[10px] text-white/60">{formatHumanDate(ev.date).split(' ')[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-navy-900">{ev.title}</h3>
                  <StatusBadge status={ev.effectiveStatus} />
                  {ev.isInauguration && (
                    <span className="chip bg-g-yellow/15 text-yellow-700"><Sparkles className="h-3 w-3" /> Inauguration</span>
                  )}
                  {ev.isCertificateEligible && (
                    <span className="chip bg-g-green/10 text-green-700"><Award className="h-3 w-3" /> Cert eligible</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-g-blue" /> {formatHumanDate(ev.date)}</span>
                  {ev.startTime && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-g-yellow" /> {ev.startTime}</span>}
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-g-green" /> {ev.venue || 'TBA'}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {ev.effectiveStatus === 'UPCOMING' && (
                  <button onClick={() => cancel(ev.eventId)} disabled={busyId === ev.eventId} className="btn-outline !py-2">
                    {busyId === ev.eventId ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
                <Link to={`/events/${ev.eventId}`} className="btn-primary !py-2">
                  View <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
