import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { api, getErrorMessage } from '../../lib/api';

export default function AdminSettings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.put('/admin/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(res.data.message);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Admin Settings" subtitle="Update your admin account password" />

      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-navy-900">Change password</h3>
            <p className="text-sm text-ink-muted">Use a strong password you don't use elsewhere.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={form.currentPassword}
              onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              required
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-g-green/20 bg-g-green/10 p-4 text-sm text-green-800">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <p>Administrator accounts are separate from student accounts. Only admins can reach this area.</p>
      </div>
    </div>
  );
}
