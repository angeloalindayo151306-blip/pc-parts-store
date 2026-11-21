import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  OFFLINE_HINT,
  useNetworkStatus,
} from '../context/NetworkStatusContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { online } = useNetworkStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    if (!online) return;
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h2>Welcome back</h2>
        <p className="auth-sub">Log in to see your cart and orders.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email"
                 value={form.email} onChange={set} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password"
                 value={form.password} onChange={set} required />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={busy || !online}
          title={online ? undefined : OFFLINE_HINT}
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        {!online && <p className="offline-hint">{OFFLINE_HINT}</p>}
        <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </main>
  );
}