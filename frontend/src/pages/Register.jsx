import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  OFFLINE_HINT,
  useNetworkStatus,
} from '../context/NetworkStatusContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const { online } = useNetworkStatus();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    if (!online) return;
    setError('');
    setFieldErrors({});
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      if (Array.isArray(err.details)) {
        const map = {};
        err.details.forEach((d) => { map[d.field] = d.message; });
        setFieldErrors(map);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h2>Create your account</h2>
        <p className="auth-sub">Start building your dream PC.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" value={form.name} onChange={set} required />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email"
                 value={form.email} onChange={set} required />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="password">Password (at least 8 characters)</label>
          <input id="password" name="password" type="password" autoComplete="new-password"
                 value={form.password} onChange={set} required />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={busy || !online}
          title={online ? undefined : OFFLINE_HINT}
        >
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
        {!online && <p className="offline-hint">{OFFLINE_HINT}</p>}
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </main>
  );
}