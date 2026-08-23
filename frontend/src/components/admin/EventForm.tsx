import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadCloud, AlertTriangle, X, Link2 } from 'lucide-react';
import { ButtonSpinner } from '../ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';
import { EVENT_CATEGORIES, formatHumanDate } from '../../lib/utils';
import type { GEvent } from '../../types';

interface EventFormData {
  title: string;
  shortDescription: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  speaker: string;
  speakerBio: string;
  category: string;
  technologies: string;
  registrationEnabled: boolean;
  registrationDeadline: string;
  capacity: string;
  googleFormUrl: string;
  registrationLink: string;
  isCertificateEligible: boolean;
  isInauguration: boolean;
  status: string;
  banner: string;
}

function toForm(event?: GEvent): EventFormData {
  return {
    title: event?.title || '',
    shortDescription: event?.shortDescription || '',
    description: event?.description || '',
    date: event?.date || '',
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    venue: event?.venue || '',
    speaker: event?.speaker || '',
    speakerBio: event?.speakerBio || '',
    category: event?.category || 'Workshop',
    technologies: (event?.technologies || []).join(', '),
    registrationEnabled: event?.registrationEnabled ?? true,
    registrationDeadline: event?.registrationDeadline || '',
    capacity: event?.capacity ? String(event.capacity) : '',
    googleFormUrl: event?.googleFormUrl || '',
    registrationLink: event?.registrationLink || '',
    isCertificateEligible: event?.isCertificateEligible ?? false,
    isInauguration: event?.isInauguration ?? false,
    status: event?.status || 'UPCOMING',
    banner: event?.banner || '',
  };
}

export function EventForm({ event, onSaved }: { event?: GEvent; onSaved?: () => void }) {
  const isEdit = Boolean(event);
  const [form, setForm] = useState<EventFormData>(toForm(event));
  const [busy, setBusy] = useState(false);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be smaller than 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('banner', String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      toast.error('Event title and date are required.');
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : 0,
      technologies: form.technologies
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isCertificateEligible: form.isInauguration ? false : form.isCertificateEligible,
    };

    try {
      const res = isEdit
        ? await api.put(`/admin/events/${event?.eventId}`, payload)
        : await api.post('/admin/events', payload);
      toast.success(res.data.message);
      onSaved?.();
      if (!isEdit) {
        setForm(toForm());
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Inauguration warning */}
      {form.isInauguration && (
        <div className="flex items-start gap-3 rounded-xl border border-g-yellow/40 bg-g-yellow/10 p-4 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Inauguration event</p>
            <p className="mt-0.5">
              This event will not contribute to certificate eligibility. It will still appear in events, the
              timeline, gallery and attendance records.
            </p>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h3 className="mb-5 font-display text-base font-bold text-navy-900">Basic details</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ev-title">Event name <span className="text-g-red">*</span></label>
            <input id="ev-title" className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Web Development Bootcamp" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ev-short">Short description</label>
            <input id="ev-short" className="input" value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} placeholder="A one-line summary for cards" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ev-desc">Full description</label>
            <textarea id="ev-desc" rows={5} className="input resize-y" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Detailed description of the event…" />
          </div>
          <div>
            <label className="label" htmlFor="ev-date">Date (YYYY-MM-DD) <span className="text-g-red">*</span></label>
            <input id="ev-date" className="input font-mono" value={form.date} onChange={(e) => update('date', e.target.value)} placeholder="2026-09-20" />
            {form.date && <p className="mt-1 text-xs text-ink-faint">→ {formatHumanDate(form.date)}</p>}
          </div>
          <div>
            <label className="label" htmlFor="ev-venue">Venue</label>
            <input id="ev-venue" className="input" value={form.venue} onChange={(e) => update('venue', e.target.value)} placeholder="CS Seminar Hall" />
          </div>
          <div>
            <label className="label" htmlFor="ev-start-time">Start Time</label>
            <input id="ev-start-time" className="input font-mono" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} placeholder="09:00" />
          </div>
          <div>
            <label className="label" htmlFor="ev-end-time">End Time</label>
            <input id="ev-end-time" className="input font-mono" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} placeholder="17:00" />
          </div>
          <div>
            <label className="label" htmlFor="ev-cat">Category</label>
            <select id="ev-cat" className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-5 font-display text-base font-bold text-navy-900">Speaker & topics</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ev-speaker">Speaker</label>
            <input id="ev-speaker" className="input" value={form.speaker} onChange={(e) => update('speaker', e.target.value)} placeholder="Speaker name" />
          </div>
          <div>
            <label className="label" htmlFor="ev-tech">Technologies (comma separated)</label>
            <input id="ev-tech" className="input" value={form.technologies} onChange={(e) => update('technologies', e.target.value)} placeholder="React, TypeScript, Tailwind" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ev-speaker-bio">Speaker bio</label>
            <textarea id="ev-speaker-bio" rows={3} className="input resize-y" value={form.speakerBio} onChange={(e) => update('speakerBio', e.target.value)} placeholder="About the speaker…" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-5 font-display text-base font-bold text-navy-900">Registration & flags</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ev-capacity">Registration limit (0 = unlimited)</label>
            <input id="ev-capacity" type="number" min={0} className="input" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} placeholder="120" />
          </div>
          <div>
            <label className="label" htmlFor="ev-deadline">Registration deadline (YYYY-MM-DD)</label>
            <input id="ev-deadline" className="input font-mono" value={form.registrationDeadline} onChange={(e) => update('registrationDeadline', e.target.value)} placeholder="2026-09-18" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ev-reg-link">
              <span className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Registration Link (for event emails)</span>
            </label>
            <input id="ev-reg-link" className="input font-mono text-sm" value={form.registrationLink} onChange={(e) => update('registrationLink', e.target.value)} placeholder="Optional custom registration URL" />
            <p className="mt-1 text-xs text-ink-faint">Used in the "Register Now" button when sending event announcement emails to students (defaults to official GDGoC GCEE event page).</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-navy-100 p-4 transition hover:bg-navy-50/50">
            <input type="checkbox" className="h-4 w-4 accent-[#34A853]" checked={form.registrationEnabled} onChange={(e) => update('registrationEnabled', e.target.checked)} />
            <div>
              <p className="text-sm font-semibold text-navy-900">Registration enabled</p>
              <p className="text-xs text-ink-muted">Allow students to register for this event.</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-navy-100 p-4 transition hover:bg-navy-50/50">
            <input type="checkbox" className="h-4 w-4 accent-[#34A853]" checked={form.isInauguration} onChange={(e) => update('isInauguration', e.target.checked)} />
            <div>
              <p className="text-sm font-semibold text-navy-900">Inauguration event</p>
              <p className="text-xs text-ink-muted">If enabled, this event will NOT contribute to certificate eligibility.</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-navy-100 p-4 transition hover:bg-navy-50/50 disabled:cursor-not-allowed disabled:opacity-50">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#34A853]"
              checked={form.isCertificateEligible}
              disabled={form.isInauguration}
              onChange={(e) => update('isCertificateEligible', e.target.checked)}
            />
            <div>
              <p className="text-sm font-semibold text-navy-900">Certificate eligible</p>
              <p className="text-xs text-ink-muted">
                {form.isInauguration
                  ? 'Automatically disabled because this is an inauguration event.'
                  : 'Attendance for this event counts towards certificates.'}
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-5 font-display text-base font-bold text-navy-900">Banner</h3>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 p-6 transition hover:border-g-blue hover:bg-g-blue/5 sm:w-auto">
            <UploadCloud className="h-5 w-5 text-g-blue" />
            <span className="text-sm font-medium text-navy-900">Upload banner image</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
          {form.banner && (
            <div className="relative">
              <img src={form.banner} alt="Banner preview" className="h-28 w-48 rounded-xl object-cover" />
              <button type="button" onClick={() => update('banner', '')} className="absolute -right-2 -top-2 rounded-full bg-g-red p-1 text-white" aria-label="Remove banner">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEdit && (
        <div className="card p-6">
          <label className="label" htmlFor="ev-status">Status</label>
          <select id="ev-status" className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
            <option value="UPCOMING">UPCOMING</option>
            <option value="ONGOING">ONGOING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link to="/admin/events" className="btn-outline">Cancel</Link>
        <button type="submit" disabled={busy} className="btn-primary !px-6">
          {busy ? <ButtonSpinner /> : null}
          {busy ? 'Saving…' : isEdit ? 'Update event' : 'Create event'}
        </button>
      </div>
    </form>
  );
}
