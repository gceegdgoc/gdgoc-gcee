import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Award,
  ExternalLink,
  AlertTriangle,
  Building2,
  User2,
  MessageSquare,
} from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import { EventRegistrationForm } from '../../components/events/EventRegistrationForm';
import { api, getErrorMessage } from '../../lib/api';
import { formatHumanDate, formatHumanDateTime, isEventRegistrationOpen, getEffectiveEventStatus } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import type { GEvent } from '../../types';

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<GEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { student } = useAuth();

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/events/${eventId}`);
      setEvent(res.data.event);
      setRegistered(Boolean(res.data.registered));
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24">
        <PageLoader label="Loading event..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white px-4 pt-28 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-lg font-bold text-black">Event not found</p>
          <Link to="/events" className="mt-6 inline-flex items-center gap-2 border border-black/20 px-5 py-2.5 font-mono text-sm font-semibold text-black transition hover:bg-black hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to events
          </Link>
        </div>
      </div>
    );
  }

  const effectiveStatus = getEffectiveEventStatus(event);
  const isUpcoming = effectiveStatus === 'UPCOMING';
  const isOngoing = effectiveStatus === 'ONGOING';
  const isCompleted = effectiveStatus === 'COMPLETED';
  const isCancelled = effectiveStatus === 'CANCELLED';
  const hasGoogleForm = Boolean(event.googleFormUrl);
  const totalRegistered = event.registeredCount + (event.manualRegistrationCount || 0);

  const handleStudentRegister = async () => {
    if (!event) return;
    if (!isEventRegistrationOpen(event)) {
      toast.error('Registration for this event is closed (closes 1 day before event date).');
      return;
    }
    if (!student) { setShowForm(true); return; }
    setRegBusy(true);
    try {
      const res = await api.post(`/events/${event.eventId}/register`);
      setRegistered(true);
      if (res.data.registeredCount !== undefined) {
        setEvent((prev) => prev ? { ...prev, registeredCount: res.data.registeredCount } : null);
      }
      toast.success('Registration successful! Live attendee count updated.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <>
      <section className="min-h-screen bg-white">
        {/* Back navigation */}
        <div className="container-x pt-24 pb-6 md:pt-28">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 font-mono text-sm font-semibold text-black/50 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" /> Back to events
          </Link>
        </div>

        {/* Banner */}
        {event.banner && (
          <div className="container-x pb-8">
            <div className="overflow-hidden rounded-xl border border-black/10">
              <img src={event.banner} alt={event.title} className="h-48 w-full object-cover md:h-72 lg:h-80" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="container-x pb-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div>
              {/* Title — large pixel-block style */}
              <h1 className="font-mono text-3xl font-black leading-tight tracking-tighter text-black md:text-4xl lg:text-5xl">
                {event.title.toUpperCase()}
              </h1>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={event.effectiveStatus} />
                <span className="rounded bg-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                  {event.category}
                </span>
                {event.isCertificateEligible && (
                  <span className="flex items-center gap-1 rounded bg-green-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                    <Award className="h-3 w-3" /> Certificate
                  </span>
                )}
                {event.isInauguration && (
                  <span className="flex items-center gap-1 rounded bg-yellow-500 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
                    Inauguration
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="my-8 h-px bg-black/10" />

              {/* Mission Scope */}
              <div>
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-black/40">
                  :: MISSION_SCOPE
                </h2>
                <div className="mt-4 flex gap-4">
                  <div className="w-0.5 shrink-0 bg-black/20" />
                  <p className="whitespace-pre-line text-base leading-relaxed text-ink-soft">
                    {event.description || event.shortDescription || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Technologies */}
              {event.technologies.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-black/40">
                    Technologies
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.technologies.map((t) => (
                      <span key={t} className="rounded border border-black/10 bg-white px-3 py-1 font-mono text-xs text-black/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Speaker */}
              {event.speaker && (
                <div className="mt-8">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-black/40">
                    Speaker / Guest
                  </h2>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-black text-white">
                      <User2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-black">🎙 {event.speaker}</p>
                      {event.speakerBio && <p className="mt-1 text-sm text-ink-soft">{event.speakerBio}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="my-8 h-px bg-black/10" />

              {/* Event Status card */}
              <div className="rounded border border-black/10 p-6">
                {isCompleted ? (
                  <div className="text-center">
                    <p className="font-mono text-2xl font-black text-black">✓</p>
                    <p className="mt-2 font-mono text-sm font-bold uppercase tracking-wider text-black">
                      EVENT COMPLETED
                    </p>
                    <p className="mt-2 text-sm text-black/40">
                      This event has finished. Photos, outcomes, and certificates will be updated soon.
                    </p>
                  </div>
                ) : isOngoing ? (
                  <div className="text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <span className="h-3 w-3 animate-ping rounded-full bg-amber-500" />
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold uppercase tracking-wider text-amber-700">
                      LIVE / ONGOING NOW
                    </p>
                    <p className="mt-2 text-sm text-black/40">
                      This event is currently in session!
                    </p>
                  </div>
                ) : isCancelled ? (
                  <div className="text-center">
                    <p className="font-mono text-sm font-bold uppercase tracking-wider text-red-600">
                      EVENT CANCELLED
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-mono text-sm font-bold uppercase tracking-wider text-black">
                      EVENT UPCOMING
                    </p>
                    <p className="mt-2 text-sm text-black/40">
                      Registration details are available. Register using the button on the right.
                    </p>
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div className="mt-6 rounded border border-black/10 p-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-black/30" />
                  <div>
                    <p className="font-mono text-sm font-bold uppercase tracking-wider text-black">
                      SUBMIT YOUR FEEDBACK
                    </p>
                    <p className="mt-1 text-xs text-black/40">
                      Help us improve future events with your feedback.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — sticky sidebar */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="border border-black/10">
                {/* Info section */}
                <div className="border-b border-black/5 p-6">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-black/40">
                    Event Info
                  </h3>
                  <div className="mt-4 space-y-4">
                    <InfoRow icon={CalendarDays} label="Date" value={formatHumanDate(event.date)} />
                    <InfoRow icon={Clock} label="Time" value={event.startTime ? `${event.startTime} — ${event.endTime || 'TBA'}` : 'TBA'} />
                    <InfoRow icon={MapPin} label="Venue" value={event.venue || 'TBA'} />
                    <InfoRow icon={Building2} label="Organizer" value="GDGoC GCEE" />
                    <InfoRow icon={Users} label="Registered" value={`${totalRegistered}${event.capacity > 0 ? ` / ${event.capacity}` : ''}`} />
                  </div>
                </div>

                {/* Registration section */}
                <div className="p-6">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-black/40">
                    Registration
                  </h3>

                  {event.isInauguration && (
                    <div className="mt-4 flex items-start gap-2 rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      This is the inauguration event. It will not contribute to certificate eligibility.
                    </div>
                  )}

                  {event.isCertificateEligible && (
                    <div className="mt-3 flex items-start gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                      <Award className="mt-0.5 h-4 w-4 shrink-0" />
                      Attending this event counts towards your participation certificate.
                    </div>
                  )}

                  {event.registrationDeadline ? (
                    <p className="mt-3 font-mono text-xs text-black/40">
                      Deadline: {formatHumanDateTime(event.registrationDeadline)}
                    </p>
                  ) : (
                    <p className="mt-3 font-mono text-xs text-black/40">
                      Deadline: 1 day before event date (until 11:59 PM IST)
                    </p>
                  )}

                  <div className="mt-4">
                    {event.effectiveStatus === 'CANCELLED' ? (
                      <div className="rounded border border-red-200 bg-red-50 p-3 text-center font-mono text-sm font-bold text-red-600">
                        Event cancelled
                      </div>
                    ) : registered ? (
                      <div className="space-y-3">
                        <div className="rounded border border-green-200 bg-green-50 p-3 text-center font-mono text-sm font-bold text-green-700">
                          ✓ You are registered!
                        </div>
                        {hasGoogleForm && (
                          <a
                            href={event.googleFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-2 border border-black bg-black px-6 py-3 font-mono text-sm font-bold text-white transition hover:bg-white hover:text-black"
                          >
                            Open Google Form <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ) : isUpcoming && isEventRegistrationOpen(event) ? (
                      student ? (
                        <div className="space-y-3">
                          <button
                            onClick={handleStudentRegister}
                            disabled={regBusy}
                            className="flex w-full items-center justify-center gap-2 border border-black bg-black px-6 py-3 font-mono text-sm font-bold text-white transition hover:bg-white hover:text-black disabled:opacity-50"
                          >
                            {regBusy ? 'Registering...' : 'Register for Event'}
                          </button>
                          {hasGoogleForm && (
                            <a
                              href={event.googleFormUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex w-full items-center justify-center gap-2 border border-black/20 bg-white px-6 py-2.5 font-mono text-xs font-bold text-black transition hover:bg-black hover:text-white"
                            >
                              Google Form Link <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="flex w-full items-center justify-center gap-2 border border-black bg-black px-6 py-3 font-mono text-sm font-bold text-white transition hover:bg-white hover:text-black"
                          >
                            Register for Event <ExternalLink className="h-4 w-4" />
                          </button>
                          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                            <Link
                              to={`/login?redirect=${encodeURIComponent(`/events/${event.eventId}`)}`}
                              className="border border-black/20 bg-white px-3 py-2 font-mono text-xs font-semibold text-black transition hover:bg-black hover:text-white"
                            >
                              Sign In
                            </Link>
                            <Link
                              to={`/join?redirect=${encodeURIComponent(`/events/${event.eventId}`)}`}
                              className="border border-black/20 bg-white px-3 py-2 font-mono text-xs font-semibold text-black transition hover:bg-black hover:text-white"
                            >
                              Join Club
                            </Link>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="rounded border border-black/10 bg-gray-50 p-4 text-center font-mono text-sm">
                        <p className="font-bold text-black/70">Registration Closed</p>
                        <p className="mt-1 text-xs text-black/40">
                          {isCompleted
                            ? 'This event has concluded.'
                            : 'Registration closed 1 day before the event date.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Registration Form Modal */}
      {showForm && (
        <EventRegistrationForm
          event={event}
          onClose={() => setShowForm(false)}
          onSuccess={(newCount) => {
            setRegistered(true);
            setEvent((prev) => prev ? { ...prev, registeredCount: newCount } : null);
          }}
        />
      )}
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-black/5 text-black/40">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/30">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-black">{value}</p>
      </div>
    </div>
  );
}
