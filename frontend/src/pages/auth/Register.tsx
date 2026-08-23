import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Mail,
  KeyRound,
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useAuth, getErrorMessage } from '../../context/AuthContext';
import { DEPARTMENTS, YEARS } from '../../lib/utils';

type Step = 1 | 2;

export default function Register() {
  const { registerStudent, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: 'Government College of Engineering, Erode',
    rollNumber: '',
    department: '',
    year: '',
    password: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await registerStudent(form);
      toast.success('OTP sent to your Gmail! Please check your inbox.');
      setStep(2);
      startResendCooldown();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Unable to send OTP. Please check your email address and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpSending(true);
    try {
      await sendOtp(form.email);
      toast.success('New OTP sent to your Gmail.');
      startResendCooldown();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }
    setOtpVerifying(true);
    try {
      await verifyOtp(form.email, otp);
      toast.success('Email verified! Welcome to GDGoC GCEE!');
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero top bar */}
      <div className="relative overflow-hidden bg-navy-950 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-g-blue/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-g-green/15 blur-3xl" />
        </div>
        <div className="container-x relative z-10">
          <div className="mb-6 flex justify-center">
            <Logo light />
          </div>
          <span className="chip border border-white/15 bg-white/5 text-white/80">
            <span className="h-2 w-2 animate-pulse rounded-full bg-g-green" />
            Community Registration
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Join GDGoC{' '}
            <span className="bg-gradient-to-r from-g-blue via-g-green to-g-yellow bg-clip-text text-transparent">
              GCEE
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            Become part of the Google Developer Groups on Campus community at Government College of Engineering, Erode.
          </p>
        </div>
        <div className="relative z-10 mt-10 flex h-1">
          <div className="flex-1 bg-g-blue" />
          <div className="flex-1 bg-g-green" />
          <div className="flex-1 bg-g-yellow" />
          <div className="flex-1 bg-g-red" />
        </div>
      </div>

      {/* Step indicators */}
      <div className="container-x -mt-6 flex max-w-md justify-center gap-3">
        {[
          { num: 1 as Step, label: 'Your info' },
          { num: 2 as Step, label: 'Verify email' },
        ].map(({ num, label }) => (
          <div
            key={num}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
              step >= num
                ? 'border-g-blue bg-g-blue text-white shadow-md'
                : 'border-navy-200 bg-white text-ink-muted'
            }`}
          >
            {step > num ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <span className="font-mono font-bold">{num}</span>
            )}
            {label}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="container-x mx-auto mb-20 mt-6 max-w-xl">
        <div className="card p-7 sm:p-9">
          {step === 1 && (
            <form onSubmit={submitRegistration} className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-navy-900">Basic information</h2>
                <p className="mt-1 text-sm text-ink-muted">Fill in your student details to join.</p>
              </div>

              <div>
                <label className="label" htmlFor="name">
                  Full name <span className="text-g-red">*</span>
                </label>
                <input
                  id="name"
                  className="input"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="email">
                    Email <span className="text-g-red">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="rollNumber">
                    Register number
                  </label>
                  <input
                    id="rollNumber"
                    className="input"
                    value={form.rollNumber}
                    onChange={(e) => update('rollNumber', e.target.value)}
                    placeholder="e.g. 21CSE001"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="year">
                    Year
                  </label>
                  <select
                    id="year"
                    className="input"
                    value={form.year}
                    onChange={(e) => update('year', e.target.value)}
                  >
                    <option value="">Select year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  className="input"
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-navy-100" />

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="password">
                    Password <span className="text-g-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? 'text' : 'password'}
                      className="input pr-11"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-navy-900"
                      aria-label="Toggle password visibility"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="confirmPassword">
                    Confirm password <span className="text-g-red">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type={show ? 'text' : 'password'}
                    className="input"
                    value={form.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full !py-3 font-semibold text-sm"
              >
                {busy ? <ButtonSpinner /> : <UserPlus className="h-4 w-4" />}
                {busy ? 'Sending OTP…' : 'Join Community'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-g-blue/10">
                  <Mail className="h-8 w-8 text-g-blue" />
                </div>
                <h2 className="font-display text-xl font-bold text-navy-900">Verify your email</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  We've sent a 6-digit OTP to <strong>{form.email}</strong>. Enter it below to complete your registration.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="otp">
                  <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Enter OTP</span>
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input text-center font-mono text-2xl tracking-[0.5em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-outline flex-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={otpVerifying || otp.length !== 6}
                  className="btn-primary flex-1 !py-3 font-semibold text-sm"
                >
                  {otpVerifying ? <ButtonSpinner /> : <CheckCircle2 className="h-4 w-4" />}
                  {otpVerifying ? 'Verifying…' : 'Verify & Complete'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpSending || resendCooldown > 0}
                  className="text-sm font-semibold text-g-blue hover:underline disabled:text-ink-muted disabled:no-underline"
                >
                  {otpSending
                    ? 'Sending…'
                    : resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <p className="mt-6 text-center text-sm text-ink-soft">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-g-blue hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {/* Benefits strip */}
        {step === 1 && (
          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { emoji: '🎓', label: 'Free workshops & events' },
              { emoji: '🏆', label: 'Hackathons & certificates' },
              { emoji: '🤝', label: 'Developer community' },
            ].map(({ emoji, label }) => (
              <div key={label} className="rounded-xl border border-navy-100 bg-white p-3 text-ink-muted shadow-card">
                <span className="text-xl">{emoji}</span>
                <p className="mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
