import { useState } from 'react';
import toast from 'react-hot-toast';
import { Save, User2 } from 'lucide-react';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useAuth, getErrorMessage } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { DEPARTMENTS, YEARS } from '../../lib/utils';

export default function Profile() {
  const { student, setStudent } = useAuth();

  const [form, setForm] = useState({
    name: student?.name || '',
    phone: student?.phone || '',
    department: student?.department || '',
    year: student?.year || '',
    rollNumber: student?.rollNumber || '',
    bio: student?.bio || '',
    github: student?.socialLinks?.github || '',
    linkedin: student?.socialLinks?.linkedin || '',
    instagram: student?.socialLinks?.instagram || '',
    twitter: student?.socialLinks?.twitter || '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        name: form.name,
        phone: form.phone,
        department: form.department,
        year: form.year,
        rollNumber: form.rollNumber,
        bio: form.bio,
        socialLinks: {
          github: form.github,
          linkedin: form.linkedin,
          instagram: form.instagram,
          twitter: form.twitter,
        },
      });
      setStudent(res.data.student);
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">Keep your details up to date.</p>
      </div>

      <div className="card p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-g-blue to-g-green text-2xl font-bold text-white">
              {form.name.charAt(0) || 'S'}
            </div>
            <div>
              <p className="font-semibold text-navy-900">{form.name || 'Your name'}</p>
              <p className="flex items-center gap-1 text-sm text-ink-muted">
                <User2 className="h-3.5 w-3.5" /> {student?.email}
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-name">Full name</label>
              <input id="p-name" className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="p-phone">Phone</label>
              <input id="p-phone" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="p-roll">Roll number</label>
              <input id="p-roll" className="input" value={form.rollNumber} onChange={(e) => update('rollNumber', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="p-year">Year</label>
              <select id="p-year" className="input" value={form.year} onChange={(e) => update('year', e.target.value)}>
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="p-dept">Department</label>
              <select id="p-dept" className="input" value={form.department} onChange={(e) => update('department', e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="p-bio">Short bio</label>
              <textarea id="p-bio" rows={3} className="input resize-y" value={form.bio} onChange={(e) => update('bio', e.target.value)} placeholder="A little about you…" />
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-navy-900">Social links</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="s-github">GitHub</label>
                <input id="s-github" className="input" value={form.github} onChange={(e) => update('github', e.target.value)} placeholder="https://github.com/username" />
              </div>
              <div>
                <label className="label" htmlFor="s-linkedin">LinkedIn</label>
                <input id="s-linkedin" className="input" value={form.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="https://linkedin.com/in/username" />
              </div>
              <div>
                <label className="label" htmlFor="s-instagram">Instagram</label>
                <input id="s-instagram" className="input" value={form.instagram} onChange={(e) => update('instagram', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="s-twitter">Twitter / X</label>
                <input id="s-twitter" className="input" value={form.twitter} onChange={(e) => update('twitter', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="submit" disabled={saving} className="btn-primary !px-6">
              {saving ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
