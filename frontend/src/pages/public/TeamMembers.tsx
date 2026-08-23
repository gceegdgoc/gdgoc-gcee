import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { MemberCard } from '../../components/members/MemberCard';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { api, getErrorMessage } from '../../lib/api';
import { TEAMS } from '../../lib/utils';
import type { Member } from '../../types';

const ACADEMIC_YEARS = ['2026–27', '2025–26'];

export default function TeamMembers() {
  const [grouped, setGrouped] = useState<Record<string, Member[]>>({});
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2026–27');

  useEffect(() => {
    let mounted = true;
    api
      .get('/members')
      .then((res) => {
        if (mounted) setGrouped(res.data.grouped || {});
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const hasMembers = TEAMS.some((t) => (grouped[t] || []).length > 0);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Board Members header */}
      <div className="pt-24 pb-4 md:pt-28 md:pb-6">
        <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#111] sm:text-4xl md:text-[2.75rem]">
            Board Members
          </h1>
          <div className="relative mx-auto mt-4 inline-flex items-center">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="appearance-none rounded-lg border border-black/10 bg-white px-4 py-2 pr-9 text-sm font-medium text-[#111] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:border-black/20 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-black/35" />
          </div>
        </div>
      </div>

      {/* Members grid */}
      <div className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
        {loading ? (
          <PageLoader label="Loading board members…" />
        ) : hasMembers ? (
          <div className="space-y-10">
            {TEAMS.filter((team) => (grouped[team] || []).length > 0).map((team) => (
              <div key={team}>
                <h2 className="mb-5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-black/30 sm:text-xs">
                  {team}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-4">
                  {(grouped[team] || []).map((member) => (
                    <MemberCard key={member._id} member={member} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No board members yet"
            description="The board member directory is being updated. Check back soon."
          />
        )}

        {/* Join CTA */}
        {!loading && (
          <div className="mt-14 rounded-2xl border border-black/6 bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-10">
            <h3 className="font-display text-xl font-bold text-[#111] sm:text-2xl">
              Want to be part of this team?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-black/40">
              Join the community and contribute to events, projects and the club's growth.
            </p>
            <Link
              to="/join"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
            >
              Join Community
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
