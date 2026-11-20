import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { reconcileOrder } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso } from '../utils/format.js';
import { friendlyError } from '../utils/errorMessages.js';
import { STATUS_LABEL } from './Orders.jsx';

const PAID = ['paid', 'processing', 'shipped', 'delivered'];

// The heading depends on the SERVER's order status, never on which URL we landed on.
function describe(status) {
  if (PAID.includes(status)) {
    return { tone: 'good', icon: '✓', title: 'Payment confirmed', text: 'The server verified your payment with the gateway.' };
  }
  if (status === 'payment_flagged') {
    return { tone: 'warn', icon: '!', title: 'Payment under review', text: 'Something about the payment did not match, so a person will review it. You do not need to pay again.' };
  }
  if (status === 'pending_payment') {
    return { tone: 'wait', icon: '…', title: 'Payment not confirmed yet', text: 'We have not received a confirmation. If you completed payment, wait a moment and check again. Otherwise you can try paying again.' };
  }
  return { tone: 'bad', icon: '×', title: 'Order closed', text: 'This order was cancelled or expired, and the reserved stock was released.' };
}

export default function PaymentReturn({ variant }) {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, order: null, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    if (!token || !orderId) {
      setState({ loading: false, order: null, error: '' });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: '' }));
    reconcileOrder(token, orderId)
      .then((data) => {
        if (!stale) setState({ loading: false, order: data.order, error: '' });
      })
      .catch((err) => {
        if (!stale) setState({ loading: false, order: null, error: friendlyError(err) });
      });
    return () => {
      stale = true;
    };
  }, [token, orderId, attempt]);

  if (!token) return <Navigate to="/login" replace />;

  if (!orderId) {
    return (
      <main className="container page-shell">
        <section className="co-card empty-state">
          <h1>No order specified</h1>
          <p>Open your orders to see their payment status.</p>
          <Link className="co-submit" to="/orders">
            View orders
          </Link>
        </section>
      </main>
    );
  }

  const { loading, order, error } = state;
  const info = order ? describe(order.status) : null;

  return (
    <main className="container page-shell">
      <section className="co-card pay-result" aria-live="polite">
        {loading && <p>Verifying your payment with the server…</p>}

        {!loading && error && (
          <>
            <span className="pay-result-icon tone-bad">×</span>
            <h1>We could not check this payment</h1>
            <p>{error}</p>
            <button className="co-submit" type="button" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </>
        )}

        {!loading && order && (
          <>
            <span className={`pay-result-icon tone-${info.tone}`}>{info.icon}</span>
            <h1>{info.title}</h1>
            <p>{info.text}</p>
            <dl className="pay-result-facts">
              <div>
                <dt>Order</dt>
                <dd>#{order.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{STATUS_LABEL[order.status] || order.status}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{peso(order.total_centavos)}</dd>
              </div>
            </dl>
            {order.status === 'pending_payment' && (
              <button className="status-button" type="button" onClick={() => setAttempt((n) => n + 1)}>
                Check again
              </button>
            )}
            <Link className="co-submit" to={`/orders/${order.id}`}>
              {order.status === 'pending_payment' && variant === 'cancelled'
                ? 'Pay again'
                : 'View order'}
            </Link>
          </>
        )}
      </section>
    </main>
  );
}