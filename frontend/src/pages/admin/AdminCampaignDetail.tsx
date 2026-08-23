import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Calculator, Sparkles, Award, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/Spinner';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { formatDotDate, cn } from '../../lib/utils';
import type { Campaign, EligibilityStudent } from '../../types';

export default function AdminCampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<{
    eligibleEvents: any[];
    perStudent: EligibilityStudent[];
    qualifiedCount: number;
    generatedCount: number;
    studentsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [calcBusy, setCalcBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [singleBusy, setSingleBusy] = useState<string | null>(null);

  const load = async (withEligibility = false) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/certificate-campaigns/${id}`);
      setCampaign(res.data.campaign);
      setCerts(res.data.certificates || []);
      if (withEligibility) {
        const calc = await api.post(`/admin/certificate-campaigns/${id}/calculate`);
        setEligibility(calc.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
  }, [id]);

  const calculate = async () => {
    setCalcBusy(true);
    try {
      const res = await api.post(`/admin/certificate-campaigns/${id}/calculate`);
      setEligibility(res.data);
      toast.success(`Eligibility calculated — ${res.data.qualifiedCount} eligible of ${res.data.studentsCount} students.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCalcBusy(false);
    }
  };

  const generate = async () => {
    if (!window.confirm('Generate certificates for all eligible students? Existing certificates will be skipped.')) return;
    setGenBusy(true);
    try {
      const res = await api.post(`/admin/certificate-campaigns/${id}/generate`);
      toast.success(res.data.message);
      const calc = await api.post(`/admin/certificate-campaigns/${id}/calculate`);
      setEligibility(calc.data);
      load(false);
      if (res.data.skipped?.length) {
        toast(`Skipped ${res.data.skipped.length} existing certificate(s).`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenBusy(false);
    }
  };

  const generateOne = async (studentId: string, name: string) => {
    if (!window.confirm(`Generate certificate for "${name}"?`)) return;
    setSingleBusy(studentId);
    try {
      const res = await api.post(`/admin/certificate-campaigns/${id}/generate/${studentId}`);
      toast.success(res.data.message);
      load(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSingleBusy(null);
    }
  };

  if (loading) return <PageLoader label="Loading campaign…" />;
  if (!campaign) return <EmptyNotFound />;

  const hasCerts = certs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        subtitle={`${formatDotDate(campaign.startDate)} → ${formatDotDate(campaign.endDate)}`}
        actions={
          <Link to="/admin/certificate-campaigns" className="btn-outline">
            <ArrowLeft className="h-4 w-4" /> Campaigns
          </Link>
        }
      />

      {/* Campaign summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Minimum attendance" value={`${campaign.minimumAttendancePercentage}%`} />
        <SummaryCard label="Minimum events" value={`${campaign.minimumEligibleEvents}`} />
        <SummaryCard label="Eligible students" value={eligibility ? String(eligibility.qualifiedCount) : '—'} />
        <SummaryCard label="Certificates generated" value={String(certs.length)} />
      </div>

      {campaign.status === 'CLOSED' && (
        <div className="flex items-start gap-3 rounded-xl border border-g-blue/30 bg-g-blue/10 p-4 text-sm text-blue-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>This campaign is closed. You can now calculate eligibility and generate certificates.</p>
        </div>
      )}

      {/* Actions */}
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-navy-900">Generate certificates</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Inauguration events are excluded. Certificate period uses the first → last eligible event date.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={calculate} disabled={calcBusy} className="btn-dark">
            {calcBusy ? <ButtonSpinner /> : <Calculator className="h-4 w-4" />}
            {calcBusy ? 'Calculating…' : 'Calculate Eligibility'}
          </button>
          <button onClick={generate} disabled={genBusy} className="btn-primary">
            {genBusy ? <ButtonSpinner /> : <Sparkles className="h-4 w-4" />}
            {genBusy ? 'Generating…' : 'Generate Certificates'}
          </button>
        </div>
      </div>

      {/* Eligibility table */}
      {eligibility && (
        <div className="card overflow-x-auto">
          <div className="border-b border-navy-50 p-5">
            <h3 className="font-display text-base font-bold text-navy-900">Eligibility results</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {eligibility.eligibleEvents.length} eligible event(s) · {eligibility.qualifiedCount} of {eligibility.studentsCount} students qualify
            </p>
          </div>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Attended</th>
                <th className="p-4 font-medium">Attendance %</th>
                <th className="p-4 font-medium">Qualifies</th>
                <th className="p-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {eligibility.perStudent.map((s) => {
                const hasCert = certs.some((c) => c.studentEmail === s.email);
                return (
                  <tr key={s.studentId} className={cn('transition hover:bg-navy-50/50', !s.qualifies && 'opacity-60')}>
                    <td className="p-4">
                      <p className="font-semibold text-navy-900">{s.name}</p>
                      <p className="font-mono text-[11px] text-ink-faint">{s.rollNumber || s.email}</p>
                    </td>
                    <td className="p-4 text-ink-soft">{s.attended}</td>
                    <td className="p-4">
                      <span className={cn('font-semibold', s.attendancePercentage >= campaign.minimumAttendancePercentage ? 'text-green-700' : 'text-g-red')}>
                        {s.attendancePercentage}%
                      </span>
                    </td>
                    <td className="p-4">
                      {s.qualifies ? (
                        <span className="chip bg-g-green/10 text-green-700"><CheckCircle2 className="h-3 w-3" /> Eligible</span>
                      ) : (
                        <span className="chip bg-slate-100 text-slate-500">Not eligible</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end">
                        {s.qualifies && !hasCert ? (
                          <button onClick={() => generateOne(s.studentId, s.name)} disabled={singleBusy === s.studentId} className="btn-green !py-1.5 text-xs">
                            {singleBusy === s.studentId ? 'Generating…' : <><Award className="h-3.5 w-3.5" /> Generate</>}
                          </button>
                        ) : hasCert ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Issued
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Eligible events */}
      {(eligibility?.eligibleEvents?.length ?? 0) > 0 && (
        <div className="card p-6">
          <h3 className="mb-4 font-display text-base font-bold text-navy-900">Eligible events</h3>
          <div className="flex flex-wrap gap-2">
            {eligibility!.eligibleEvents.map((e) => (
              <span key={String(e._id)} className="chip border border-navy-100 bg-navy-50 text-navy-800">
                {e.title} · {formatDotDate(e.date)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Generated certificates */}
      {hasCerts && (
        <div className="card overflow-x-auto">
          <div className="border-b border-navy-50 p-5">
            <h3 className="font-display text-base font-bold text-navy-900">Generated certificates ({certs.length})</h3>
          </div>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-4 font-medium">Certificate ID</th>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Attendance</th>
                <th className="p-4 font-medium">Issued</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {certs.map((c) => (
                <tr key={c.certificateId} className="transition hover:bg-navy-50/50">
                  <td className="p-4 font-mono text-xs font-semibold text-navy-900">{c.certificateId}</td>
                  <td className="p-4 font-semibold text-navy-900">{c.studentName}</td>
                  <td className="p-4 text-ink-soft">{c.attendancePercentage}%</td>
                  <td className="p-4 text-ink-soft">{formatDotDate(c.issueDate)}</td>
                  <td className="p-4">
                    <span className={cn('chip', c.status === 'VALID' ? 'bg-g-green/10 text-green-700' : 'bg-g-red/10 text-g-red')}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasCerts && (
        <div className="flex justify-end">
          <Link to="/admin/certificates" className="btn-outline">
            <RefreshCw className="h-4 w-4" /> Manage all certificates
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

function EmptyNotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-semibold text-navy-900">Campaign not found</p>
      <Link to="/admin/certificate-campaigns" className="btn-outline mt-6">
        <ArrowLeft className="h-4 w-4" /> Back to campaigns
      </Link>
    </div>
  );
}
