import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock } from 'lucide-react';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useAuth, getErrorMessage } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your credentials.');
      return;
    }
    setBusy(true);
    try {
      await loginAdmin(email, password);
      toast.success('Admin access granted.');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-g-blue/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-g-green/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
          <p className="mt-1 text-sm text-white/60">Restricted access — GDGoC GCEE administrators only.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-9">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-g-blue focus:outline-none focus:ring-4 focus:ring-g-blue/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gdgocgcee.in"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-g-blue focus:outline-none focus:ring-4 focus:ring-g-blue/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
              {busy ? <ButtonSpinner /> : <Lock className="h-4 w-4" />}
              {busy ? 'Verifying…' : 'Sign in to Admin'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/50">
          <Link to="/login" className="font-medium text-white/80 hover:text-white">
            ← Back to student login
          </Link>
        </p>
      </div>
    </div>
  );
}
