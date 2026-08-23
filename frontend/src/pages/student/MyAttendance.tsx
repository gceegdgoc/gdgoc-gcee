import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardCheck, QrCode, CalendarDays } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate, cn } from '../../lib/utils';
import type { AttendanceRecord } from '../../types';

export default function MyAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/attendance/my')
      .then((res) => mounted && setRecords(res.data.attendance))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const attended = records.filter((r) => r.status === 'PRESENT').length;
  const pct = records.length ? Math.round((attended / records.length) * 100) : 0;

  if (loading) return <PageLoader label="Loading attendance…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">My Attendance</h1>
          <p className="mt-1 text-sm text-ink-muted">Attendance is recorded only on the day of each event.</p>
        </div>
        <div className="flex gap-4">
          <div className="card px-5 py-3 text-center">
            <p className="font-display text-xl font-bold text-g-blue">{attended}</p>
            <p className="text-xs text-ink-muted">Present</p>
          </div>
          <div className="card px-5 py-3 text-center">
            <p className="font-display text-xl font-bold text-g-green">{pct}%</p>
            <p className="text-xs text-ink-muted">Attendance</p>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-7 w-7" />}
          title="No attendance records yet"
          description="Once you attend events, your records will appear here."
          action={
            <Link to="/events" className="btn-primary"><CalendarDays className="h-4 w-4" /> Find events</Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-4 font-medium">Event</th>
                <th className="p-4 font-medium">Event date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Method</th>
                <th className="p-4 font-medium">Marked at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {records.map((r) => (
                <tr key={r.id} className="transition hover:bg-navy-50/50">
                  <td className="p-4 font-semibold text-navy-900">{r.eventTitle || '—'}</td>
                  <td className="p-4 text-ink-soft">{formatHumanDate(r.eventDate)}</td>
                  <td className="p-4">
                    <span className={cn('chip', r.status === 'PRESENT' ? 'bg-g-green/10 text-green-700' : 'bg-g-red/10 text-g-red')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      {r.method === 'QR' && <QrCode className="h-4 w-4 text-g-blue" />}
                      {r.method}
                    </span>
                  </td>
                  <td className="p-4 text-ink-soft">
                    {r.markedAt ? new Date(r.markedAt).toLocaleString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="rounded-xl bg-navy-50 p-4 text-xs leading-relaxed text-ink-muted">
        <strong>Note:</strong> Attendance for an event is valid only on the actual event date (Asia/Kolkata time).
        Inauguration events are recorded but never count toward certificate eligibility.
      </p>
    </div>
  );
}
