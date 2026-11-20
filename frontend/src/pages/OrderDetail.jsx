import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { cancelOrder, getOrder } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso } from '../utils/format.js';
import { STATUS_LABEL } from './Orders.jsx';

function formatDate(value) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function OrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getOrder(token, id)
      .then((data) => {
        if (!cancelled) setOrder(data);
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
  }, [token, id]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      'Cancel this unpaid order? Reserved stock will be returned.'
    );

    if (!confirmed) return;

    setCancelling(true);
    setError('');

    try {
      await cancelOrder(token, id);
      const updated = await getOrder(token, id);
      setOrder(updated);
    } catch (err) {
      setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="container page-shell">
        <div className="co-card loading-state">Loading order…</div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="container page-shell">
        <div className="co-card empty-state">
          <h1>Order unavailable</h1>
          <p>{error || 'This order could not be found.'}</p>
          <Link className="co-submit" to="/orders">
            Back to orders
          </Link>
        </div>
      </main>
    );
  }

  const address = order.shipping_address || {};

  return (
    <main className="container page-shell">
      <div className="page-heading order-detail-heading">
        <div>
          <Link className="text-link" to="/orders">
            ← All orders
          </Link>
          <span className="eyebrow">ORDER DETAILS</span>
          <h1>#{order.id.slice(0, 8).toUpperCase()}</h1>
          <p>Created {formatDate(order.created_at)}</p>
        </div>

        <span className={`ostatus large ostatus-${order.status}`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="order-detail-grid">
        <div className="order-detail-main">
          <section className="co-card">
            <div className="co-card-heading">
              <div className="co-step">01</div>
              <div>
                <h2>PC parts</h2>
                <p>{order.items?.length || 0} product line(s)</p>
              </div>
            </div>

            <div className="detail-items">
              {order.items?.map((item) => (
                <div className="detail-item" key={item.id || item.product_id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>
                      {peso(item.unit_price_centavos)} × {item.quantity}
                    </span>
                  </div>
                  <strong>
                    {peso(item.unit_price_centavos * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="co-card">
            <div className="co-card-heading">
              <div className="co-step">02</div>
              <div>
                <h2>Shipping address</h2>
                <p>Delivery information saved with the order</p>
              </div>
            </div>

            <address className="shipping-address">
              <strong>{address.fullName}</strong>
              <span>{address.phone}</span>
              <span>{address.line1}</span>
              {address.line2 && <span>{address.line2}</span>}
              <span>
                {address.city}, {address.province} {address.postalCode}
              </span>
            </address>
          </section>

          <section className="co-card">
            <div className="co-card-heading">
              <div className="co-step">03</div>
              <div>
                <h2>Status history</h2>
                <p>Every order status change is recorded.</p>
              </div>
            </div>

            <div className="timeline">
              {order.history?.map((entry, index) => (
                <div className="timeline-item" key={entry.id || index}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <strong>
                      {entry.from_status
                        ? `${STATUS_LABEL[entry.from_status] || entry.from_status} → `
                        : ''}
                      {STATUS_LABEL[entry.to_status] || entry.to_status}
                    </strong>
                    <span>{formatDate(entry.created_at)}</span>
                    {entry.note && <p>{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="co-card payment-summary">
          <span className="eyebrow">PAYMENT SUMMARY</span>

          <div className="summary-lines">
            <div>
              <span>Subtotal</span>
              <strong>{peso(order.subtotal_centavos)}</strong>
            </div>

            <div>
              <span>Discount</span>
              <strong>
                {order.discount_centavos
                  ? `−${peso(order.discount_centavos)}`
                  : peso(0)}
              </strong>
            </div>

            {order.coupon_code && (
              <div>
                <span>Coupon</span>
                <strong>{order.coupon_code}</strong>
              </div>
            )}

            <div>
              <span>Shipping</span>
              <strong>
                {order.shipping_centavos === 0
                  ? 'FREE'
                  : peso(order.shipping_centavos)}
              </strong>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <strong>{peso(order.total_centavos)}</strong>
            </div>
          </div>

          {order.status === 'pending_payment' &&
            order.reservation_expires_at && (
              <div className="reservation-notice">
                <span>Stock reserved until</span>
                <strong>{formatDate(order.reservation_expires_at)}</strong>
              </div>
            )}

          <button className="maya-button" type="button" disabled>
            Pay with Maya — coming next
          </button>

          {order.status === 'pending_payment' && (
            <button
              className="cancel-order-button"
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel unpaid order'}
            </button>
          )}

          <p className="summary-disclaimer">
            A payment redirect will never mark an order as paid. Payment will
            be confirmed securely by the backend.
          </p>
        </aside>
      </div>
    </main>
  );
}