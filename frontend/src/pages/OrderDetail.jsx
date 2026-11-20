import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { cancelOrder, getOrder, payOrder, reconcileOrder } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso } from '../utils/format.js';
import { friendlyError } from '../utils/errorMessages.js';
import { STATUS_LABEL } from './Orders.jsx';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

// Only follow https gateway URLs, or our own site (the dev mock page).
function safeRedirect(url) {
  const target = new URL(url, window.location.origin);
  const sameSite = target.origin === window.location.origin;
  if (target.protocol !== 'https:' && !sameSite) {
    throw new Error('The payment link looks unsafe, so it was not opened.');
  }
  window.location.href = target.href;
}

export default function OrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
        if (!cancelled) setError(friendlyError(err));
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
    const confirmed = window.confirm('Cancel this unpaid order? Reserved stock will be returned.');
    if (!confirmed) return;
    setCancelling(true);
    setError('');
    setNotice('');
    try {
      await cancelOrder(token, id);
      setOrder(await getOrder(token, id));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    setError('');
    setNotice('');
    try {
      const data = await payOrder(token, id);
      safeRedirect(data.checkoutUrl); // leaves the page; the button stays disabled
    } catch (err) {
      setError(friendlyError(err));
      setPaying(false);
      if (err.code === 'RESERVATION_EXPIRED' || err.code === 'ORDER_NOT_PAYABLE') {
        try {
          setOrder(await getOrder(token, id));
        } catch {
          /* keep the error message */
        }
      }
    }
  }

  // For a webhook that never arrived: the server asks the gateway directly.
  async function handleCheckStatus() {
    setChecking(true);
    setError('');
    setNotice('');
    try {
      const data = await reconcileOrder(token, id);
      setOrder(data.order);
      if (data.order.status === 'pending_payment') {
        setNotice('No payment has been confirmed yet.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setChecking(false);
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
  const unpaid = order.status === 'pending_payment';
  const isPaid = ['paid', 'processing', 'shipped', 'delivered'].includes(order.status);

  return (
    <main className={`container page-shell${unpaid ? ' has-pay-bar' : ''}`}>
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

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="pay-notice" role="status">
          {notice}
        </div>
      )}
      {isPaid && (
        <div className="pay-notice pay-notice-good" role="status">
          Payment confirmed by the server. Thank you!
        </div>
      )}
      {order.status === 'payment_flagged' && (
        <div className="pay-notice pay-notice-warn" role="status">
          Your payment is under review because something did not match. No action is needed from
          you. {order.flag_reason ? `Reason: ${order.flag_reason}` : ''}
        </div>
      )}

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
                  <strong>{peso(item.unit_price_centavos * item.quantity)}</strong>
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
                {order.discount_centavos ? `−${peso(order.discount_centavos)}` : peso(0)}
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
              <strong>{order.shipping_centavos === 0 ? 'FREE' : peso(order.shipping_centavos)}</strong>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{peso(order.total_centavos)}</strong>
            </div>
          </div>

          {unpaid && order.reservation_expires_at && (
            <div className="reservation-notice">
              <span>Stock reserved until</span>
              <strong>{formatDate(order.reservation_expires_at)}</strong>
            </div>
          )}

          {unpaid && (
            <>
              <button
                className="status-button"
                type="button"
                onClick={handleCheckStatus}
                disabled={checking || paying}
              >
                {checking ? 'Checking…' : 'I already paid — check status'}
              </button>
              <button
                className="cancel-order-button"
                type="button"
                onClick={handleCancel}
                disabled={cancelling || paying}
              >
                {cancelling ? 'Cancelling…' : 'Cancel unpaid order'}
              </button>
            </>
          )}

          <p className="summary-disclaimer">
            A payment redirect never marks an order as paid. Payment is confirmed securely by the
            backend.
          </p>
        </aside>
      </div>

      {unpaid && (
        <div className="pay-bar">
          <div className="pay-bar-total">
            <span>Total</span>
            <strong>{peso(order.total_centavos)}</strong>
          </div>
          <button
            className="pay-bar-button"
            type="button"
            onClick={handlePay}
            disabled={paying || cancelling}
          >
            {paying ? 'Redirecting…' : 'Pay now'}
          </button>
        </div>
      )}
    </main>
  );
}