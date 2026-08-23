import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Award,
  BadgeCheck,
  UsersRound,
  TrendingUp,
  Plus,
  ArrowRight,
  ClipboardList,
  RefreshCw,
  ExternalLink,
  Search,
  Download,
  Mail,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageHeader, StatCard } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate, formatHumanDateTime, cn, isEventRegistrationOpen, getEffectiveEventStatus } from '../../lib/utils';
import type { AdminStats } from '../../types';

const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#1b3a66', '#3b6fc4'];

interface EventRegistration {
  eventId: string;
  title: string;
  date: string;
  category: string;
  capacity: number;
  registrationEnabled: boolean;
  responseSheetId: string;
  lastSyncedAt: string | null;
  registrationCount: number;
  status: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRegistration[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/admin/dashboard')
      .then((res) => mounted && setData(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await api.get('/admin/events-with-registrations');
      setEvents(res.data.events);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (!data) return <div className="text-ink-muted">Unable to load dashboard data.</div>;

  const s: AdminStats = data.stats;
  const charts = data.charts;

  const registrationData = (charts.registrationTrends || []).map((r: any) => ({ name: r._id, Registrations: r.count }));
  const attendanceData = (charts.attendanceTrends || []).map((r: any) => ({ name: r._id, Attendance: r.count }));
  const categoryData = (charts.participationByCategory || []).map((r: any) => ({ name: r._id || 'Other', count: r.count }));
  const eventAttendance = (charts.attendanceByEvent || []).map((r: any) => ({ name: String(r._id || 'Other').slice(0, 22), Present: r.count }));

  const totalWebhookRegistrations = events.reduce((sum, e) => sum + e.registrationCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of the GDGoC GCEE community platform."
        actions={
          <Link to="/admin/events/create" className="btn-primary">
            <Plus className="h-4 w-4" /> New event
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Students" value={s.totalStudents} icon={<Users className="h-5 w-5" />} color="bg-g-blue/10 text-g-blue" />
        <StatCard label="Verified Students" value={s.verifiedStudents || 0} icon={<CheckCircle2 className="h-5 w-5" />} color="bg-g-green/10 text-green-700" />
        <StatCard label="Total Events" value={s.totalEvents} icon={<CalendarDays className="h-5 w-5" />} color="bg-navy-900/5 text-navy-800" />
        <StatCard label="Events Email Sent" value={s.eventsEmailSent || 0} icon={<Mail className="h-5 w-5" />} color="bg-g-yellow/15 text-yellow-700" />
        <StatCard label="Upcoming Events" value={s.upcomingEvents} icon={<CalendarClock className="h-5 w-5" />} color="bg-g-yellow/15 text-yellow-700" />
        <StatCard label="Completed Events" value={s.completedEvents} icon={<CheckCircle2 className="h-5 w-5" />} color="bg-g-green/10 text-green-700" />
        <StatCard label="Attendance Records" value={s.attendanceRecords} icon={<ClipboardCheck className="h-5 w-5" />} color="bg-g-red/10 text-g-red" />
        <StatCard label="Community Members" value={s.members} icon={<UsersRound className="h-5 w-5" />} color="bg-g-yellow/15 text-yellow-700" />
        <StatCard label="Form Registrations" value={totalWebhookRegistrations} icon={<ClipboardList className="h-5 w-5" />} color="bg-g-blue/10 text-g-blue" />
        <StatCard label="Learning Resources" value={s.totalResources || 0} icon={<BookOpen className="h-5 w-5" />} color="bg-purple-100 text-purple-800" />
      </div>

      {/* Event Registration Cards */}
      <div className="card overflow-hidden">
        <div className="border-b border-navy-50 p-5 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-g-blue" /> Event Registrations
          </h3>
          <button onClick={loadEvents} disabled={eventsLoading} className="btn-outline !py-1.5 !px-3 text-xs">
            {eventsLoading ? <ButtonSpinner /> : <RefreshCw className="h-3.5 w-3.5" />}
            {eventsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {eventsLoading ? (
          <PageLoader label="Loading events…" />
        ) : events.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">No events found.</p>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const pct = ev.capacity > 0 ? Math.round((ev.registrationCount / ev.capacity) * 100) : 0;
              const effStatus = getEffectiveEventStatus(ev);
              const regOpen = isEventRegistrationOpen(ev);
              return (
                <div key={ev.eventId} className="rounded-xl border border-navy-100 bg-white p-4 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy-900">{ev.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{formatHumanDate(ev.date)} · {ev.category}</p>
                    </div>
                    <span className={cn(
                      'chip shrink-0 text-[10px]',
                      effStatus === 'COMPLETED'
                        ? 'bg-slate-100 text-slate-700 font-semibold'
                        : effStatus === 'ONGOING'
                        ? 'bg-amber-100 text-amber-800 font-semibold'
                        : regOpen
                        ? 'bg-g-green/10 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {effStatus === 'COMPLETED'
                        ? 'Completed'
                        : effStatus === 'ONGOING'
                        ? 'Live / Ongoing'
                        : regOpen
                        ? 'Open'
                        : 'Closed'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink-muted">Registered</span>
                      <span className="font-bold text-navy-900">{ev.registrationCount}{ev.capacity > 0 ? ` / ${ev.capacity}` : ''}</span>
                    </div>
                    {ev.capacity > 0 && (
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-50">
                        <div
                          className={cn('h-full rounded-full transition-all', pct >= 90 ? 'bg-g-red' : pct >= 70 ? 'bg-g-yellow' : 'bg-g-green')}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                    {ev.capacity > 0 && (
                      <p className="mt-1 text-[10px] text-ink-faint">{pct}% filled</p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <Link
                      to={`/admin/events/${ev.eventId}`}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-900 transition hover:bg-navy-50"
                    >
                      <Search className="h-3 w-3" /> View Registrations
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-navy-900">
            <TrendingUp className="h-4 w-4 text-g-blue" /> Registration trends
          </h3>
          {registrationData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">No registration data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Registrations" stroke="#4285F4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-navy-900">
            <ClipboardCheck className="h-4 w-4 text-g-green" /> Attendance trends
          </h3>
          {attendanceData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">No attendance data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Attendance" stroke="#34A853" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 font-display text-base font-bold text-navy-900">Participation by category</h3>
          {categoryData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">No category data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1b3a66" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-display text-base font-bold text-navy-900">Attendance by event</h3>
          {eventAttendance.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">No event attendance data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventAttendance} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Bar dataKey="Present" fill="#FBBC05" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resource Center Overview */}
      <div className="card overflow-hidden">
        <div className="border-b border-navy-50 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-navy-900">
                Resource Center
              </h3>
              <p className="text-xs text-ink-muted">
                Curated tutorials, guides, and learning resources ({s.totalResources || 0} total)
              </p>
            </div>
          </div>
          <Link
            to="/admin/resources"
            className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            Manage Resources <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data.recentResources && data.recentResources.length > 0 ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentResources.map((res: any) => (
              <div
                key={res._id}
                className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-purple-200 hover:bg-purple-50/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="chip text-[10px] bg-purple-100 text-purple-800 font-semibold">
                      {res.category}
                    </span>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-purple-600 transition"
                      title="Open Resource Link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h4 className="mt-2.5 font-bold text-sm text-navy-900 line-clamp-1">
                    {res.title}
                  </h4>
                  {res.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {res.description}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] text-slate-400">
                  <span>By {res.uploadedBy || 'GDGoC Team'}</span>
                  <span>{formatHumanDate(res.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-muted">No learning resources added yet.</p>
            <Link
              to="/admin/resources"
              className="mt-2 inline-block text-xs font-semibold text-g-blue hover:underline"
            >
              + Add first learning resource
            </Link>
          </div>
        )}
      </div>

      {/* Recent form registrations */}
      {data.recentFormRegistrations?.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="border-b border-navy-50 p-5 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-g-blue" /> Recent form registrations
            </h3>
            <Link to="/admin/form-registrations" className="text-sm font-semibold text-g-blue hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Department</th>
                <th className="p-4 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {data.recentFormRegistrations.map((r: any) => (
                <tr key={r._id} className="transition hover:bg-navy-50/50">
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
                  <td className="p-4 text-ink-muted text-xs">{formatHumanDateTime(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
