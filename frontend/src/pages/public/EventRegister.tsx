import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Mail,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { PageLoader, ButtonSpinner } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import type { GEvent } from '../../types';

interface VerifiedMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  rollNumber: string;
}

export default function EventRegister() {
  const { eventId } = useParams();
  const [params] = useSearchParams();
  const emailParam = params.get('email') || '';
  const { student: authStudent } = useAuth();

  const [event, setEvent] = useState<GEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(emailParam || authStudent?.email || '');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [verifiedMember, setVerifiedMember] = useState<VerifiedMember | null>(null);
  const [notMemberMessage, setNotMemberMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadEvent() {
      try {
        const res = await api.get(`/events/${eventId}`);
        if (!mounted) return;
        setEvent(res.data.event);
        if (res.data.isRegistered) {
          setIsRegistered(true);
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEvent();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  // If user is already logged in as a verified student, auto-check membership
  useEffect(() => {
    if (authStudent?.email && !verifiedMember && event) {
      setEmail(authStudent.email);
      handleCheckMembership(authStudent.email);
    }
  }, [authStudent, event]);

  const handleCheckMembership = async (emailToCheck?: string) => {
    const targetEmail = (emailToCheck || email).trim().toLowerCase();
    if (!targetEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setChecking(true);
    setNotMemberMessage(null);
    setVerifiedMember(null);

    try {
      const res = await api.post(`/events/${eventId}/check-membership`, { email: targetEmail });
      if (res.data.isMember) {
        setVerifiedMember(res.data.student);
        if (res.data.isAlreadyRegistered) {
          setIsRegistered(true);
        }
        toast.success(`Verified member: ${res.data.student.name}`);
      } else {
        setNotMemberMessage(
          res.data.message || 'Please join GDGoC GCEE before registering for this event.'
        );
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setNotMemberMessage(msg);
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!verifiedMember || !event) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/events/${eventId}/register-public`, {
        email: verifiedMember.email,
        name: verifiedMember.name,
        phone: verifiedMember.phone,
        college: verifiedMember.college,
        department: verifiedMember.department,
        year: verifiedMember.year,
        rollNumber: verifiedMember.rollNumber,
      });

      setIsRegistered(true);
      if (res.data.registrationId) {
        setRegistrationId(res.data.registrationId);
      }

      // Broadcast live count update
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gdgoc_events_sync');
          channel.postMessage({
            type: 'EVENT_REGISTERED',
            eventId: event.eventId,
            registeredCount: res.data.registeredCount ?? (event.registeredCount + 1),
          });
          channel.close();
        }
      } catch (bcErr) {
        console.warn('BroadcastChannel error:', bcErr);
      }

      toast.success('Registration completed! Attendee count updated.');

      if (event.googleFormUrl) {
        window.open(event.googleFormUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-28">
        <PageLoader label="Loading event registration..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white px-4 pt-28 pb-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-mono text-lg font-bold text-black">Event not found</p>
          <Link
            to="/events"
            className="mt-6 inline-flex items-center gap-2 border border-black/20 px-5 py-2.5 font-mono text-sm font-semibold text-black transition hover:bg-black hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="container-x mx-auto max-w-2xl">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to={`/events/${event.eventId}`}
            className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-black/50 transition hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Event Details
          </Link>
        </div>

        {/* Event Summary Card */}
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
          {event.banner && (
            <div className="h-44 w-full overflow-hidden bg-navy-950">
              <img
                src={event.banner}
                alt={event.title}
                className="h-full w-full object-cover opacity-90"
              />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-g-blue/10 px-2.5 py-0.5 font-mono text-xs font-bold text-g-blue">
                {event.category}
              </span>
              <span className="rounded bg-navy-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-navy-800">
                GDGoC GCEE
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
              {event.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-y-2 gap-x-6 text-xs text-ink-muted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-g-blue" />
                <span>{formatHumanDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-g-green" />
                <span>{event.startTime ? `${event.startTime} - ${event.endTime || 'TBA'}` : 'TBA'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-g-red" />
                <span>{event.venue || 'Government College of Engineering, Erode'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification & Registration Box */}
        <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex items-center gap-3 border-b border-navy-100 pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-navy-900">
                Student Membership Verification
              </h2>
              <p className="text-xs text-ink-muted">
                Only verified GDGoC GCEE community members can register for this event.
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="mt-6 space-y-6">
            {/* Step 1: Member Email Check */}
            {!verifiedMember ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckMembership();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label" htmlFor="student-email">
                    Enter your student email
                  </label>
                  <div className="relative">
                    <input
                      id="student-email"
                      type="email"
                      className="input pl-10"
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setNotMemberMessage(null);
                      }}
                      required
                    />
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checking || !email.trim()}
                  className="btn-primary w-full !py-3 font-semibold"
                >
                  {checking ? <ButtonSpinner /> : <UserCheck className="h-4 w-4" />}
                  {checking ? 'Checking membership…' : 'Verify Membership'}
                </button>

                {/* Not Member Warning Banner */}
                {notMemberMessage && (
                  <div className="rounded-xl border border-g-red/20 bg-g-red/5 p-5 text-sm">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-g-red" />
                      <div className="flex-1">
                        <p className="font-semibold text-g-red">Membership Required</p>
                        <p className="mt-1 text-xs text-navy-700 leading-relaxed">
                          {notMemberMessage}
                        </p>
                        <p className="mt-2 text-xs text-ink-muted">
                          You must first become a community member before you can register for GDGoC GCEE workshops and events.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            to={`/join?redirect=${encodeURIComponent(`/events/${event.eventId}`)}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-g-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-g-blue/90"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Join GDGoC GCEE
                          </Link>
                          <Link
                            to={`/login?redirect=${encodeURIComponent(`/events/${event.eventId}`)}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-xs font-bold text-navy-800 shadow-sm transition hover:bg-navy-50"
                          >
                            Sign In
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              /* Step 2: Verified Member Details & Registration Action */
              <div className="space-y-6">
                {/* Verified Member Badge */}
                <div className="rounded-xl border border-g-green/20 bg-g-green/5 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-g-green" />
                      <span className="font-display font-bold text-green-900">
                        Verified GDGoC GCEE Member
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedMember(null);
                        setEmail('');
                      }}
                      className="text-[11px] font-semibold text-ink-muted hover:text-navy-900"
                    >
                      Change
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-navy-800">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-ink-faint">Name</p>
                      <p className="font-semibold">{verifiedMember.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-ink-faint">Email</p>
                      <p className="font-semibold font-mono">{verifiedMember.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-ink-faint">Department</p>
                      <p className="font-semibold">{verifiedMember.department || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-ink-faint">Year / Roll</p>
                      <p className="font-semibold">
                        {verifiedMember.year ? `Year ${verifiedMember.year}` : ''} {verifiedMember.rollNumber ? `(${verifiedMember.rollNumber})` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Already Registered / Registration Action */}
                {isRegistered ? (
                  <div className="rounded-xl border border-navy-100 bg-white p-6 text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-g-green/10 text-g-green">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-navy-900">
                        You are registered for this event!
                      </h3>
                      {registrationId && (
                        <p className="mt-1 font-mono text-xs font-bold text-g-blue">
                          Registration ID: {registrationId}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-ink-muted">
                        A confirmation email has been sent to <strong>{verifiedMember.email}</strong>.
                      </p>
                    </div>

                    {event.googleFormUrl && (
                      <div className="pt-2">
                        <a
                          href={event.googleFormUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-g-blue px-6 py-3 font-mono text-xs font-bold text-white transition hover:bg-g-blue/90"
                        >
                          Open Google Form <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {event.googleFormUrl ? (
                      <div className="space-y-3">
                        <p className="text-xs text-ink-muted leading-relaxed">
                          Your membership is verified. Click below to continue to the event's official Google Form to submit your registration:
                        </p>
                        <button
                          onClick={handleCompleteRegistration}
                          disabled={submitting}
                          className="btn-primary w-full !py-3.5 font-semibold text-sm"
                        >
                          {submitting ? <ButtonSpinner /> : <ExternalLink className="h-4 w-4" />}
                          {submitting ? 'Recording & Opening Form…' : 'Continue to Google Form'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-ink-muted leading-relaxed">
                          Click below to confirm your registration for {event.title}:
                        </p>
                        <button
                          onClick={handleCompleteRegistration}
                          disabled={submitting}
                          className="btn-primary w-full !py-3.5 font-semibold text-sm"
                        >
                          {submitting ? <ButtonSpinner /> : <CheckCircle2 className="h-4 w-4" />}
                          {submitting ? 'Registering…' : 'Confirm Registration'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Community Info Banner */}
        <div className="mt-6 rounded-xl border border-navy-100 bg-white p-5 text-center text-xs text-ink-muted">
          <p>
            GDGoC GCEE · Google Developer Groups on Campus · Government College of Engineering, Erode
          </p>
        </div>
      </div>
    </div>
  );
}
