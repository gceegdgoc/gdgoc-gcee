import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Search, UserX, UserCheck, Trash2, Download, ShieldCheck, ShieldOff, Eye, Mail, Phone, GraduationCap, CalendarDays, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { api, getErrorMessage } from '../../lib/api';
import { cn, downloadBlob, DEPARTMENTS, formatHumanDate } from '../../lib/utils';

interface Row {
  id: string;
  name: string;
  email: string;
  phone?: string;
  rollNumber?: string;
  department?: string;
  year?: string;
  college?: string;
  isActive: boolean;
  isVerified?: boolean;
  joinedAt?: string;
  points?: number;
  bio?: string;
  eventsAttended?: number;
  eventsRegistered?: number;
}

export default function AdminStudents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [details, setDetails] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/students', {
        params: { q: query || undefined, department: department === 'ALL' ? undefined : department },
      });
      setRows(res.data.students);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query, department]);

  const toggleStatus = async (id: string, isActive: boolean) => {
    try {
      const res = await api.patch(`/admin/students/${id}/status`);
      toast.success(res.data.message);
      setRows((r) => r.map((x) => (x.id === id ? { ...x, isActive: !isActive } : x)));
      if (details?.id === id) setDetails((d) => (d ? { ...d, isActive: !isActive } : d));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete student "${name}"? Attendance and registration history will also be removed.`)) return;
    try {
      const res = await api.delete(`/admin/students/${id}`);
      toast.success(res.data.message);
      setRows((r) => r.filter((x) => x.id !== id));
      setDetails(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const activeCount = rows.filter((r) => r.isActive).length;
  const verifiedCount = rows.filter((r) => r.isVerified).length;

  const exportStudents = async () => {
    try {
      const res = await api.get('/admin/students/export', { responseType: 'blob' });
      downloadBlob(res.data as Blob, `students-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Students exported successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${rows.length} shown · ${activeCount} active · ${verifiedCount} verified`}
        actions={
          rows.length > 0 ? (
            <button onClick={exportStudents} className="btn-outline">
              <Download className="h-4 w-4" /> Export Excel
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-navy-200 bg-white px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or roll number…"
            className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="input w-full sm:w-64"
          aria-label="Filter by department"
        >
          <option value="ALL">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <PageLoader label="Loading students…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" />} title="No students found" description="Students who register and verify on the platform will appear here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Department</th>
                <th className="p-4 font-medium">Year</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Verified</th>
                <th className="p-4 font-medium">Signup Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {rows.map((s) => (
                <tr key={s.id} className={cn('transition hover:bg-navy-50/50', !s.isActive && 'opacity-60')}>
                  <td className="p-4">
                    <p className="font-semibold text-navy-900">{s.name}</p>
                    <p className="text-xs text-ink-muted">{s.email} · {s.rollNumber || '—'}</p>
                  </td>
                  <td className="p-4 text-ink-soft">{s.department || '—'}</td>
                  <td className="p-4 text-ink-soft">{s.year ? `Year ${s.year}` : '—'}</td>
                  <td className="p-4 text-ink-soft">{s.phone || '—'}</td>
                  <td className="p-4">
                    <span className={cn('chip', s.isVerified ? 'bg-g-green/10 text-green-700' : 'bg-g-yellow/15 text-yellow-700')}>
                      {s.isVerified ? (
                        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1"><ShieldOff className="h-3 w-3" /> Pending</span>
                      )}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-ink-muted">{s.joinedAt ? formatHumanDate(s.joinedAt) : '—'}</td>
                  <td className="p-4">
                    <span className={cn('chip', s.isActive ? 'bg-g-green/10 text-green-700' : 'bg-slate-100 text-slate-500')}>
                      {s.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setDetails(s)}
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-g-blue/10 hover:text-g-blue"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(s.id, s.isActive)}
                        className="rounded-lg p-2 text-ink-soft transition hover:bg-g-yellow/15 hover:text-yellow-700"
                        title={s.isActive ? 'Disable account' : 'Enable account'}
                      >
                        {s.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button onClick={() => remove(s.id, s.name)} className="rounded-lg p-2 text-ink-soft transition hover:bg-g-red/10 hover:text-g-red" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(details)} onClose={() => setDetails(null)} title="Student Details">
        {details && <StudentDetails student={details} onClose={() => setDetails(null)} />}
      </Modal>
    </div>
  );
}

function StudentDetails({ student, onClose }: { student: Row; onClose: () => void }) {
  const detail = (icon: React.ReactNode, label: string, value: string) => (
    <div className="flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/40 p-3">
      <div className="mt-0.5 text-g-blue">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="break-words text-sm font-medium text-navy-900">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-navy-950 p-5 text-white">
        <p className="font-display text-lg font-bold">{student.name}</p>
        <p className="text-xs text-white/60">{student.rollNumber || 'No roll number'} · {student.college}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {detail(<Mail className="h-4 w-4" />, 'Email', student.email)}
        {detail(<Phone className="h-4 w-4" />, 'Phone', student.phone || '')}
        {detail(<GraduationCap className="h-4 w-4" />, 'Department', student.department || '')}
        {detail(<CalendarDays className="h-4 w-4" />, 'Year', student.year ? `Year ${student.year}` : '')}
        {detail(<CheckCircle2 className="h-4 w-4" />, 'Verified', student.isVerified ? 'Yes' : 'No')}
        {detail(<CalendarDays className="h-4 w-4" />, 'Signup date', student.joinedAt ? formatHumanDate(student.joinedAt) : '')}
        {detail(<Users className="h-4 w-4" />, 'Events registered', student.eventsRegistered ? String(student.eventsRegistered) : '0')}
        {detail(<Users className="h-4 w-4" />, 'Events attended', student.eventsAttended ? String(student.eventsAttended) : '0')}
      </div>

      {student.bio && (
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Bio</p>
          <p className="mt-1 text-sm text-navy-900">{student.bio}</p>
        </div>
      )}

      <button onClick={onClose} className="btn-outline w-full">Close</button>
    </div>
  );
}