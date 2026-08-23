import { useEffect, useState } from 'react';
import { X, CheckCircle2, Loader2, User, Mail, Phone, Building2, GraduationCap, Hash, Sparkles, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../../lib/api';
import { isEventRegistrationOpen } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import type { GEvent } from '../../types';

interface Props {
  event: GEvent;
  onClose: () => void;
  onSuccess?: (registeredCount: number, registrationId: string, eventId: string) => void;
}

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG - 1st Year', 'PG - 2nd Year', 'Other'];
const DEPARTMENTS = ['CSE', 'IT', 'CSDS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML', 'Other'];

export function EventRegistrationForm({ event, onClose, onSuccess }: Props) {
  const { student: authStudent } = useAuth();
  const [form, setForm] = useState({
    name: authStudent?.name || '',
    email: authStudent?.email || '',
    phone: authStudent?.phone || '',
    college: authStudent?.college || 'Government College of Engineering, Erode',
    department: authStudent?.department || '',
    year: authStudent?.year || '',
    rollNumber: authStudent?.rollNumber || '',
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ registrationId: string; registeredCount: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authStudent) {
      setForm({
        name: authStudent.name || '',
        email: authStudent.email || '',
        phone: authStudent.phone || '',
        college: authStudent.college || 'Government College of Engineering, Erode',
        department: authStudent.department || '',
        year: authStudent.year || '',
        rollNumber: authStudent.rollNumber || '',
      });
    }
  }, [authStudent]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Full name is required.';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email.trim())) e.email = 'A valid email address is required.';
    if (!form.phone.trim() || form.phone.trim().length < 7) e.phone = 'Phone number is required.';
    if (!form.department) e.department = 'Department is required.';
    if (!form.year) e.year = 'Year of study is required.';
    return e;
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEventRegistrationOpen(event)) {
      toast.error('Registration for this event is closed (closes 1 day before event date).');
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setBusy(true);
    try {
      const res = await api.post(`/events/${event.eventId}/register-public`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        college: form.college.trim() || 'Government College of Engineering, Erode',
        department: form.department,
        year: form.year,
        rollNumber: form.rollNumber.trim(),
      });

      const newCount = res.data.registeredCount ?? event.registeredCount + 1;
      const regId = res.data.registrationId;

      setSuccess({
        registrationId: regId,
        registeredCount: newCount,
      });

      // Broadcast across tabs/windows for immediate live sync
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gdgoc_events_sync');
          channel.postMessage({
            type: 'EVENT_REGISTERED',
            eventId: event.eventId,
            registeredCount: newCount,
          });
          channel.close();
        }
      } catch (bcErr) {
        console.warn('BroadcastChannel error:', bcErr);
      }

      if (onSuccess) {
        onSuccess(newCount, regId, event.eventId);
      }

      toast.success(`Registration successful! Attendee count is now ${newCount}`);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      if (err.response?.data?.duplicate) {
        setErrors({ email: 'You are already registered for this event.' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/60 p-0 sm:p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-g-blue">GDGoC GCEE Registration</p>
              <h2 className="font-display text-sm font-bold text-navy-900 line-clamp-1">{event.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Closed state */}
        {!isEventRegistrationOpen(event) ? (
          <div className="flex flex-col items-center gap-5 p-6 sm:p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Registration Closed
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-navy-900">Registration is closed</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-xs mx-auto">
                Registrations automatically close 1 day prior to the event date (from 12:00 AM IST on the event date).
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 py-3 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-5 p-6 sm:p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                ✓ Registration Confirmed
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-navy-900">You're on the attendee list!</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                A confirmation email has been dispatched to <strong className="text-navy-900">{form.email}</strong>.
              </p>
            </div>

            {/* Live Count Update Display */}
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Attendee Count</p>
                <div className="mt-1 flex items-center justify-center gap-1.5 font-display text-2xl font-black text-g-blue">
                  <span>👥</span>
                  <span>{success.registeredCount}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration ID</p>
                <p className="mt-1.5 font-mono text-xs font-bold text-navy-900 truncate">
                  {success.registrationId}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              The event attendee count has been updated live in the database.
            </p>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-g-blue py-3 font-semibold text-sm text-white shadow-sm transition hover:bg-blue-600 active:scale-98"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
            <div className="space-y-4 p-6">
              {/* Name */}
              <Field label="Full Name" error={errors.name} required>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. John Doe"
                    className="input pl-10 text-sm"
                  />
                </div>
              </Field>

              {/* Email */}
              <Field label="Student Email Address" error={errors.email} required>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="student@example.com"
                    className="input pl-10 text-sm"
                  />
                </div>
              </Field>

              {/* Phone */}
              <Field label="Phone Number" error={errors.phone} required>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="10-digit mobile number"
                    className="input pl-10 text-sm"
                  />
                </div>
              </Field>

              {/* College */}
              <Field label="College / Institution">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.college}
                    onChange={(e) => handleChange('college', e.target.value)}
                    placeholder="Government College of Engineering, Erode"
                    className="input pl-10 text-sm"
                  />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {/* Department */}
                <Field label="Department" error={errors.department} required>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={form.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      className="input pl-10 text-sm"
                    >
                      <option value="">Select Dept</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </Field>

                {/* Year */}
                <Field label="Year of Study" error={errors.year} required>
                  <select
                    value={form.year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">Select Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Roll Number */}
              <Field label="Roll Number / Student ID">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.rollNumber}
                    onChange={(e) => handleChange('rollNumber', e.target.value)}
                    placeholder="e.g. 2024CSE001"
                    className="input pl-10 text-sm"
                  />
                </div>
              </Field>

              {/* Live Attendee Counter Info Box */}
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-g-blue" />
                  <span>Current Attendees:</span>
                </div>
                <span className="font-mono font-bold text-g-blue">👥 {event.registeredCount}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full !py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {busy ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Registering & Updating Count...</>
                ) : (
                  'Complete Registration'
                )}
              </button>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                Your registration will immediately increment the live attendee count on this event card.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, error, required }: { label: string; children: React.ReactNode; error?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
        {label}{required && <span className="ml-1 text-g-red">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] font-medium text-g-red">{error}</p>}
    </div>
  );
}
