import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { recommendBuild } from '../api/ai.js';
import { peso, categoryIcon } from '../utils/format.js';
import { friendlyError } from '../utils/errorMessages.js';
import './AiAssistant.css';

const USE_CASES = [
  { value: 'gaming', label: 'Gaming' },
  { value: 'editing', label: 'Video / photo editing' },
  { value: 'office', label: 'Office and study' },
];

function noteList(notes) {
  if (Array.isArray(notes)) return notes.filter((n) => typeof n === 'string' && n);
  return typeof notes === 'string' && notes ? [notes] : [];
}

export default function AiAssistant() {
  const [budget, setBudget] = useState('60000');
  const [useCase, setUseCase] = useState('gaming');
  const [notes, setNotes] = useState('');
  const [state, setState] = useState({ loading: false, error: '', result: null });
  const ctrlRef = useRef(null);

  // cancel a request that is still running when the page is closed
  useEffect(() => () => ctrlRef.current?.abort(), []);

  async function onSubmit(e) {
    e.preventDefault();
    const budgetPhp = Number(budget);
    if (!Number.isInteger(budgetPhp) || budgetPhp < 1000 || budgetPhp > 1000000) {
      setState({ loading: false, error: 'Enter a whole-peso budget between ₱1,000 and ₱1,000,000.', result: null });
      return;
    }

    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    const payload = { budgetPhp, useCase };
    if (notes.trim()) payload.notes = notes.trim();

    setState({ loading: true, error: '', result: null });
    try {
      const result = await recommendBuild(payload, ctrl.signal);
      setState({ loading: false, error: '', result });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setState({ loading: false, error: friendlyError(err), result: null });
    }
  }

  const { loading, error, result } = state;
  const extra = result ? noteList(result.notes) : [];

  return (
    <main className="container ai-page">
      <h1 className="page-title">Build assistant</h1>
      <p className="ai-intro">
        Tell us your budget and what the PC is for. We suggest a build using only parts that are in stock right now.
      </p>

      <form className="ai-form" onSubmit={onSubmit}>
        <label className="ai-field">
          <span>Budget (₱)</span>
          <input
            className="ai-input"
            type="number"
            inputMode="numeric"
            min="1000"
            max="1000000"
            step="1"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
          />
        </label>

        <label className="ai-field">
          <span>What will you use it for?</span>
          <select className="ai-input" value={useCase} onChange={(e) => setUseCase(e.target.value)}>
            {USE_CASES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ai-field">
          <span>Anything else? (optional)</span>
          <textarea
            className="ai-input"
            rows={3}
            maxLength={300}
            placeholder="e.g. I like quiet builds"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-primary ai-submit" disabled={loading}>
          {loading ? 'Building…' : 'Recommend a build'}
        </button>
      </form>

      <div aria-live="polite">
        {loading && (
          <div className="ai-loading" aria-busy="true">
            <div className="skeleton ai-skeleton" />
            <p>Picking parts for you. This can take up to a minute when the AI service is busy.</p>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {result && (
          <section className="ai-result">
            <p className={'ai-badge ' + (result.source === 'gemini' ? 'ai-badge-ai' : 'ai-badge-rules')}>
              {result.source === 'gemini' ? 'Built by Gemini AI' : 'Built by store rules (AI unavailable)'}
            </p>
            <p className="ai-summary">{result.summary}</p>

            <ul className="ai-list">
              {result.items.map((item) => (
                <li key={item.id} className="ai-item">
                  <span className="ai-icon" aria-hidden="true">
                    {categoryIcon(item.category)}
                  </span>
                  <div className="ai-item-body">
                    <small>{item.category}</small>
                    <Link to={`/products/${item.id}`}>{item.name}</Link>
                    <p>{item.reason}</p>
                  </div>
                  <strong className="ai-price">{peso(item.priceCentavos)}</strong>
                </li>
              ))}
            </ul>

            <p className="ai-total">
              Total <strong>{peso(result.totalCentavos)}</strong> of {peso(result.budgetCentavos)} budget
            </p>

            {extra.length > 0 && (
              <ul className="ai-notes">
                {extra.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}