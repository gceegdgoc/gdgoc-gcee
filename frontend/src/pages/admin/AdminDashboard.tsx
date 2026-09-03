import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  UsersRound,
  Plus,
  ArrowRight,
  Mail,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PageHeader, StatCard } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate } from '../../lib/utils';
import type { AdminStats } from '../../types';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/admin/dashboard')
      .then((res) => mounted && setData(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (!data) return <div className="text-ink-muted">Unable to load dashboard data.</div>;

  const s: AdminStats = data.stats;
  const charts = data.charts;
  const categoryData = (charts.participationByCategory || []).map((r: any) => ({ name: r._id || 'Other', count: r.count }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of the GCEE Tech Hub community platform."
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
        <StatCard label="Community Members" value={s.members} icon={<UsersRound className="h-5 w-5" />} color="bg-g-yellow/15 text-yellow-700" />
        <StatCard label="Learning Resources" value={s.totalResources || 0} icon={<BookOpen className="h-5 w-5" />} color="bg-purple-100 text-purple-800" />
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="mb-4 font-display text-base font-bold text-navy-900">Participation by event category</h3>
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
                  <span>By {res.uploadedBy || 'GCEE Tech Hub Team'}</span>
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
    </div>
  );
}
