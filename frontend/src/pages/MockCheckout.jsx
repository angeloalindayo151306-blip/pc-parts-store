import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { completeMockSession, getMockSession } from '../api/mockGateway.js';
import { peso } from '../utils/format.js';
import { friendlyError } from '../utils/errorMessages.js';

// DEVELOPMENT ONLY. Stands in for the Maya hosted checkout page.
export default function MockCheckout() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let stale = false;
    getMockSession(sessionId)
      .then((data) => {
        if (!stale) setSession(data);
      })
      .catch((err) => {
        if (!stale) setError(friendlyError(err));
      });
    return () => {
      stale = true;
    };
  }, [sessionId]);

  async function finish(outcome) {
    setBusy(outcome);
    setError('');
    try {
      await completeMockSession(sessionId, outcome);
      const page = outcome === 'paid' ? '/payment/success' : '/payment/cancelled';
      navigate(`${page}?order=${session.reference}`);
    } catch (err) {
      setError(friendlyError(err));
      setBusy('');
    }
  }

  return (
    <main className="container page-shell">
      <section className="co-card mock-gateway">
        <span className="eyebrow">MOCK GATEWAY — DEVELOPMENT ONLY</span>
        <h1>Mock Maya Checkout</h1>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {!session && !error && <p>Loading session…</p>}
        {session && (
          <>
            <p className="mock-amount">{peso(session.amountCentavos)}</p>
            <p>Order {session.reference.slice(0, 8).toUpperCase()}</p>
            <div className="mock-actions">
              <button className="mock-btn mock-pay" type="button" disabled={!!busy} onClick={() => finish('paid')}>
                {busy === 'paid' ? 'Paying…' : 'Pay'}
              </button>
              <button className="mock-btn mock-fail" type="button" disabled={!!busy} onClick={() => finish('failed')}>
                Simulate failure
              </button>
              <button className="mock-btn mock-cancel" type="button" disabled={!!busy} onClick={() => finish('cancelled')}>
                Cancel
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}