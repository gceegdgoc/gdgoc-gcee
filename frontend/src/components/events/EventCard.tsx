import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Clock, Users, Award, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { GEvent } from '../../types';
import { cn, formatHumanDate, isEventRegistrationOpen, getEffectiveEventStatus } from '../../lib/utils';
import { StatusBadge } from '../ui/Badge';

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Workshop: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' },
  Hackathon: { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200' },
  'Technical Talk': { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-200' },
  Seminar: { bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', border: 'border-purple-200' },
  'Coding Session': { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Hands-on Session': { bg: 'bg-sky-50 text-sky-700', text: 'text-sky-700', border: 'border-sky-200' },
  'Project Showcase': { bg: 'bg-pink-50 text-pink-700', text: 'text-pink-700', border: 'border-pink-200' },
  'Community Meetup': { bg: 'bg-teal-50 text-teal-700', text: 'text-teal-700', border: 'border-teal-200' },
  Other: { bg: 'bg-slate-50 text-slate-700', text: 'text-slate-700', border: 'border-slate-200' },
};

interface EventCardProps {
  event: GEvent;
  className?: string;
  isRegistered?: boolean;
  onRegisterClick?: (event: GEvent) => void;
}

export function EventCard({
  event,
  className,
  isRegistered = false,
  onRegisterClick,
}: EventCardProps) {
  const [highlightCount, setHighlightCount] = useState(false);
  const [prevCount, setPrevCount] = useState(event.registeredCount);

  // Trigger pulse effect when registration count increments
  useEffect(() => {
    if (event.registeredCount !== prevCount) {
      setHighlightCount(true);
      setPrevCount(event.registeredCount);
      const timer = setTimeout(() => setHighlightCount(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [event.registeredCount, prevCount]);

  const catStyle = categoryColors[event.category] || categoryColors.Other;
  const effectiveStatus = getEffectiveEventStatus(event);
  const isUpcoming = effectiveStatus === 'UPCOMING';
  const isOngoing = effectiveStatus === 'ONGOING';
  const isCompleted = effectiveStatus === 'COMPLETED';
  const isCancelled = effectiveStatus === 'CANCELLED';

  const formatEventDateTime = () => {
    const d = formatHumanDate(event.date);
    if (event.startTime) {
      return `${d} • ${event.startTime}`;
    }
    return d;
  };

  return (
    <div
      className={cn(
        'group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-g-blue/40 hover:shadow-md md:rounded-3xl md:p-7',
        highlightCount && 'ring-2 ring-g-blue ring-offset-2 transition-all',
        className
      )}
    >
      {/* Top Header: Date/Time + Category */}
      <div>
        <div className="flex items-center justify-between gap-2">
          {/* Category Chip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide',
                catStyle.bg,
                catStyle.border
              )}
            >
              {event.category}
            </span>
            {event.isCertificateEligible && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                <Award className="h-3 w-3" /> Cert
              </span>
            )}
            {event.isInauguration && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                <Sparkles className="h-3 w-3" /> Inauguration
              </span>
            )}
          </div>
          {/* Status Badge */}
          <StatusBadge status={effectiveStatus} />
        </div>

        {/* Date & Time */}
        <div className="mt-3.5 flex items-center gap-1.5 text-xs font-medium text-g-blue">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{formatEventDateTime()}</span>
        </div>

        {/* Title */}
        <Link to={`/events/${event.eventId}`} className="group/title mt-2 block">
          <h3 className="font-display text-lg font-bold leading-snug text-navy-900 transition-colors group-hover/title:text-g-blue sm:text-xl">
            {event.title}
          </h3>
        </Link>

        {/* Short Description */}
        <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
          {event.shortDescription || event.description}
        </p>

        {/* Venue */}
        <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-g-red" />
          <span className="truncate font-medium">{event.venue || 'Main Auditorium'}</span>
        </div>
      </div>

      {/* Card Footer: Live Registration Count + Action Button */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3">
          {/* Live Attendee Counter */}
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">
              <span className="font-bold text-navy-900">{event.registeredCount}</span>
              {event.capacity > 0 && <span className="text-slate-400">/{event.capacity}</span>}
              <span className="ml-1 text-[11px] font-normal text-slate-400">registered</span>
            </span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>

          {/* Action Button */}
          {isRegistered ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Registered
            </span>
          ) : isCancelled ? (
            <span className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600">
              Cancelled
            </span>
          ) : isCompleted ? (
            <Link
              to={`/events/${event.eventId}`}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Event Completed <ArrowRight className="h-3 w-3" />
            </Link>
          ) : isEventRegistrationOpen(event) ? (
            onRegisterClick ? (
              <button
                type="button"
                onClick={() => onRegisterClick(event)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-g-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow active:scale-95"
              >
                Register Now
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <Link
                to={`/events/${event.eventId}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-g-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow active:scale-95"
              >
                Register Now
                <ArrowRight className="h-3 w-3" />
              </Link>
            )
          ) : (
            <span
              className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-400 cursor-not-allowed select-none"
              title="Registration closed (registration closes 1 day before the event date)"
            >
              Registration Closed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
