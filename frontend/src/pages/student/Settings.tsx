import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { api, getErrorMessage } from '../../lib/api';

export default function Settings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(res.data.message);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage your account security.</p>
      </div>

      <div className="card p-6 sm:p-8">
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-navy-900">
          <KeyRound className="h-5 w-5 text-g-blue" /> Change password
        </h2>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label" htmlFor="cur-pass">Current password</label>
            <input id="cur-pass" type="password" className="input" value={form.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} autoComplete="current-password" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-pass">New password</label>
              <input id="new-pass" type="password" className="input" value={form.newPassword} onChange={(e) => update('newPassword', e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="conf-pass">Confirm new password</label>
              <input id="conf-pass" type="password" className="input" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary !px-6">
              {saving ? <ButtonSpinner /> : null}
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Account</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Need help with your account or certificate queries? Reach the community team at{' '}
          <a href="mailto:gceegdgoc@gmail.com" className="font-medium text-g-blue hover:underline">gceegdgoc@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
