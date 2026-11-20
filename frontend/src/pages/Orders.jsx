import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listOrders } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso } from '../utils/format.js';

export const STATUS_LABEL = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired',
  payment_flagged: 'Payment review',
};

function formatDate(value) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    listOrders(token)
      .then((data) => {
        if (cancelled) return;

        setOrders(Array.isArray(data) ? data : data?.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="container page-shell">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMER PORTAL</span>
          <h1>My orders</h1>
          <p>Track payments, reservations and delivery progress.</p>
        </div>
        <Link className="text-link" to="/">
          Continue shopping
        </Link>
      </div>

      {loading && <div className="co-card loading-state">Loading orders…</div>}

      {error && <div className="form-error">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <section className="co-card empty-state">
          <span className="empty-icon">📦</span>
          <h2>No orders yet</h2>
          <p>Your completed checkouts will appear here.</p>
          <Link className="co-submit" to="/">
            Build your first order
          </Link>
        </section>
      )}

      <div className="orders-list">
        {orders.map((order) => (
          <Link
            className="order-row"
            to={`/orders/${order.id}`}
            key={order.id}
          >
            <div className="order-main">
              <span className="order-number">
                ORDER #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <strong>{formatDate(order.created_at)}</strong>
            </div>

            <div className="order-row-meta">
              <span
                className={`ostatus ostatus-${order.status}`}
              >
                {STATUS_LABEL[order.status] || order.status}
              </span>
              <strong className="order-total">
                {peso(order.total_centavos)}
              </strong>
              <span className="row-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}