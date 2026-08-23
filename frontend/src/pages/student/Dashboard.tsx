import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Ticket,
  ClipboardCheck,
  Percent,
  CalendarDays,
  ArrowRight,
  User2,
} from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatHumanDate, cn } from '../../lib/utils';
import type { DashboardStats } from '../../types';

interface DashboardData {
  stats: DashboardStats;
  upcomingEvents: any[];
  recentAttendance: any[];
}

export default function Dashboard() {
  const { student } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/dashboard')
      .then((res) => mounted && setData(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <PageLoader label="Loading your dashboard…" />;
  if (!data) return <EmptyState title="Unable to load dashboard" />;

  const cards = [
    { icon: Ticket, label: 'Events Registered', value: data.stats.registered, color: 'bg-g-blue/10 text-g-blue' },
    { icon: ClipboardCheck, label: 'Events Attended', value: data.stats.attended, color: 'bg-g-green/10 text-g-green' },
    { icon: Percent, label: 'Attendance %', value: `${data.stats.attendancePercent}%`, color: 'bg-g-yellow/10 text-yellow-700' },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Welcome back, {student?.name?.split(' ')[0] || 'Developer'} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Here's what's happening in your GDGoC GCEE community.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-5">
            <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', color)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl font-bold text-navy-900">{value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming registered events */}
        <div className="card p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900">
              <CalendarDays className="h-5 w-5 text-g-blue" /> Your upcoming events
            </h2>
            <Link to="/dashboard/events" className="flex items-center gap-1 text-sm font-semibold text-g-blue hover:underline">
              All events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {data.upcomingEvents.length === 0 ? (
            <EmptyState
              icon={<Ticket className="h-6 w-6" />}
              title="No upcoming events"
              description="You haven't registered for any upcoming events yet."
              action={
                <Link to="/events" className="btn-primary">Explore events</Link>
              }
            />
          ) : (
            <div className="divide-y divide-navy-50">
              {data.upcomingEvents.map((ev) => (
                <Link key={ev._id} to={`/events/${ev.eventId}`} className="flex items-center gap-4 py-3 transition hover:bg-navy-50/60">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-900 text-white">
                    <span className="text-sm font-bold leading-none">{formatHumanDate(ev.date).split(' ')[1] || ''}</span>
                    <span className="text-[10px]">{formatHumanDate(ev.date).split(' ')[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{ev.title}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatHumanDate(ev.date)} · {ev.venue || 'Venue TBA'}
                    </p>
                  </div>
                  {ev.isInauguration && (
                    <span className="chip bg-g-yellow/15 text-yellow-700">Inauguration</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Profile summary */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy-900">
            <User2 className="h-5 w-5 text-g-green" /> Profile
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-g-blue to-g-green text-xl font-bold text-white">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy-900">{student?.name}</p>
              <p className="truncate text-xs text-ink-muted">{student?.email}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-2.5 text-sm">
            {[
              ['Roll number', student?.rollNumber || '—'],
              ['Department', student?.department || '—'],
              ['Year', student?.year || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-semibold text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
          <Link to="/dashboard/profile" className="btn-outline mt-5 w-full">Edit profile</Link>
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy-900">
          <ClipboardCheck className="h-5 w-5 text-g-yellow" /> Recent attendance
        </h2>
        {data.recentAttendance.length === 0 ? (
          <EmptyState title="No attendance yet" description="Attendance is recorded on the day of each event." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-medium">Event date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Marked at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {data.recentAttendance.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3">{formatHumanDate(a.eventDate)}</td>
                    <td className="py-3">
                      <span className={cn('chip', a.status === 'PRESENT' ? 'bg-g-green/10 text-green-700' : 'bg-g-red/10 text-g-red')}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 text-ink-soft">{a.method}</td>
                    <td className="py-3 text-ink-soft">{a.markedAt ? new Date(a.markedAt).toLocaleString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
