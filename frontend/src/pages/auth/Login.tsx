import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff, GraduationCap, Mail } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useAuth, getErrorMessage } from '../../context/AuthContext';
import { api } from '../../lib/api';

export default function Login() {
  const { loginStudent, sendOtp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await loginStudent(email, password);
      toast.success('Welcome back!');
      navigate(redirect);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      const axiosData = err?.response?.data;
      if (axiosData?.requiresVerification) {
        setNeedsVerification(true);
        toast.error('Please verify your email before logging in.');
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpBusy(true);
    try {
      await sendOtp(email);
      setOtpSent(true);
      toast.success('OTP sent to your email.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }
    setOtpBusy(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      toast.success('Email verified! Now you can log in.');
      setNeedsVerification(false);
      setOtpSent(false);
      setOtp('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-24 pb-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7 sm:p-9">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white">
              {needsVerification ? <Mail className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
            </div>
            <h1 className="font-display text-2xl font-bold text-navy-900">
              {needsVerification ? 'Verify Your Email' : 'Student Login'}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {needsVerification
                ? 'Your account needs email verification before you can log in.'
                : 'Access your dashboard and events.'}
            </p>
          </div>

          {needsVerification ? (
            <>
              {!otpSent ? (
                <div className="space-y-5">
                  <p className="text-sm text-ink-muted">
                    Click below to send a verification OTP to <strong>{email}</strong>.
                  </p>
                  <button onClick={handleSendOtp} disabled={otpBusy} className="btn-primary w-full !py-3">
                    {otpBusy ? <ButtonSpinner /> : <Mail className="h-4 w-4" />}
                    {otpBusy ? 'Sending…' : 'Send Verification OTP'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <p className="text-sm text-ink-muted">
                    Enter the 6-digit OTP sent to <strong>{email}</strong>.
                  </p>
                  <div>
                    <label className="label">OTP Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="input text-center font-mono text-xl tracking-[0.5em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                  <button type="submit" disabled={otpBusy || otp.length !== 6} className="btn-primary w-full !py-3">
                    {otpBusy ? <ButtonSpinner /> : null}
                    {otpBusy ? 'Verifying…' : 'Verify Email'}
                  </button>
                  <button type="button" onClick={handleSendOtp} disabled={otpBusy} className="w-full text-center text-sm font-semibold text-g-blue hover:underline">
                    Resend OTP
                  </button>
                </form>
              )}
              <div className="mt-4 text-center">
                <button onClick={() => { setNeedsVerification(false); setOtpSent(false); setOtp(''); }} className="text-sm text-ink-muted hover:text-navy-900">
                  ← Back to login
                </button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? 'text' : 'password'}
                      className="input pr-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-navy-900" aria-label="Toggle password visibility">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
                  {busy ? <ButtonSpinner /> : <LogIn className="h-4 w-4" />}
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-navy-100" />
                <span className="text-xs text-ink-faint">or</span>
                <span className="h-px flex-1 bg-navy-100" />
              </div>

              <div className="mt-6 space-y-3 text-center">
                <Link to="/join" className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90" style={{ backgroundColor: '#0D6EFD' }}>
                  Join Community
                </Link>
                <p className="flex items-center justify-center gap-1 text-xs text-ink-faint">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Open to all GCEE students
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
