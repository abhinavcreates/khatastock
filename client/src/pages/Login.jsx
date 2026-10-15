import { useState } from 'react';
import { api } from '../api.js';
import { inputClass, primaryBtn } from '../ui.js';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [form, setForm] = useState({ shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: form });
      onLogin(data);
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-page border border-line rounded-sm p-6">
        <div className="ledger">
          <h1 className="font-display text-3xl font-extrabold">KhataStock</h1>
          <p className="mt-1 mb-6 text-sm">
            Your items with expiry dates, and the udhaar your customers owe you.
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block text-sm font-medium">
                Shop name
                <input className={`${inputClass} mt-1 font-normal`} value={form.shopName} onChange={set('shopName')} required />
              </label>
            )}
            <label className="block text-sm font-medium">
              Email
              <input type="email" className={`${inputClass} mt-1 font-normal`} value={form.email} onChange={set('email')} required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                className={`${inputClass} mt-1 font-normal`}
                value={form.password}
                onChange={set('password')}
                minLength={6}
                required
              />
            </label>

            {error && <p className="text-sm text-brick font-medium">{error}</p>}

            <button disabled={loading} className={`${primaryBtn} w-full`}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
            className="mt-4 text-sm underline underline-offset-2 min-h-11"
          >
            {mode === 'login' ? 'New shop? Create an account' : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
