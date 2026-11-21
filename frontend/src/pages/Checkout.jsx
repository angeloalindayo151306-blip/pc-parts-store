import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createOrder } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import {
  OFFLINE_HINT,
  useNetworkStatus,
} from '../context/NetworkStatusContext.jsx';
import { peso } from '../utils/format.js';

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  province: '',
  postalCode: '',
};

export default function Checkout() {
  const { token, user } = useAuth();
  const { online } = useNetworkStatus();
  const { cart, loading, refresh } = useCart();
  const navigate = useNavigate();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [couponCode, setCouponCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.name) return;
    setAddress((current) =>
      current.fullName ? current : { ...current, fullName: user.name }
    );
  }, [user]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <main className="container page-shell">
        <div className="co-card loading-state">Loading your cart…</div>
      </main>
    );
  }

  if (!cart?.items?.length) {
    return (
      <main className="container page-shell">
        <section className="co-card empty-state">
          <span className="empty-icon">🛒</span>
          <h1>Your cart is empty</h1>
          <p>Add PC parts before proceeding to checkout.</p>
          <Link className="co-submit" to="/">
            Browse PC parts
          </Link>
        </section>
      </main>
    );
  }

  const subtotal = cart.subtotal_centavos ?? 0;
  const estimatedShipping = subtotal >= 1_000_000 ? 0 : 15_000;
  const estimatedTotal = subtotal + estimatedShipping;

  function updateAddress(event) {
    const { name, value } = event.target;
    setAddress((current) => ({
      ...current,
      [name]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!online) return;
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const shippingAddress = {
      fullName: address.fullName.trim(),
      phone: address.phone.trim(),
      line1: address.line1.trim(),
      city: address.city.trim(),
      province: address.province.trim(),
      postalCode: address.postalCode.trim(),
    };
    if (address.line2.trim()) {
      shippingAddress.line2 = address.line2.trim();
    }

    const payload = {
      shippingAddress,
      ...(couponCode.trim()
        ? { couponCode: couponCode.trim().toUpperCase() }
        : {}),
    };

    try {
      const order = await createOrder(
        token,
        idempotencyKey.current,
        payload
      );
      // The backend clears the cart after creating the order.
      await refresh().catch(() => {});
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      const nextErrors = {};
      for (const detail of err.details || []) {
        let field = Array.isArray(detail.field)
          ? detail.field.join('.')
          : String(detail.field || '');
        field = field.replace(/^shippingAddress\./, '');
        if (Object.hasOwn(EMPTY_ADDRESS, field) || field === 'couponCode') {
          nextErrors[field] = detail.message;
        }
      }
      setFieldErrors(nextErrors);
      setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container page-shell">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SECURE CHECKOUT</span>
          <h1>Complete your order</h1>
          <p>
            Stock will be reserved for 30 minutes while payment is pending.
          </p>
        </div>
        <Link className="text-link" to="/cart">
          ← Back to cart
        </Link>
      </div>

      <div className="checkout-layout">
        <form className="co-card" onSubmit={handleSubmit} noValidate>
          <div className="co-card-heading">
            <div className="co-step">1</div>
            <div>
              <h2>Shipping information</h2>
              <p>Enter the address where your PC parts should be delivered.</p>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="co-grid">
            <label className="co-field co-span-2">
              <span>Full name</span>
              <input
                className={fieldErrors.fullName ? 'has-error' : ''}
                name="fullName"
                value={address.fullName}
                onChange={updateAddress}
                autoComplete="name"
                placeholder="Juan Dela Cruz"
              />
              {fieldErrors.fullName && (
                <small>{fieldErrors.fullName}</small>
              )}
            </label>

            <label className="co-field">
              <span>Phone number</span>
              <input
                className={fieldErrors.phone ? 'has-error' : ''}
                name="phone"
                value={address.phone}
                onChange={updateAddress}
                autoComplete="tel"
                placeholder="09171234567"
              />
              {fieldErrors.phone && <small>{fieldErrors.phone}</small>}
            </label>

            <label className="co-field">
              <span>Postal code</span>
              <input
                className={fieldErrors.postalCode ? 'has-error' : ''}
                name="postalCode"
                value={address.postalCode}
                onChange={updateAddress}
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength="4"
                placeholder="1000"
              />
              {fieldErrors.postalCode && (
                <small>{fieldErrors.postalCode}</small>
              )}
            </label>

            <label className="co-field co-span-2">
              <span>Street address</span>
              <input
                className={fieldErrors.line1 ? 'has-error' : ''}
                name="line1"
                value={address.line1}
                onChange={updateAddress}
                autoComplete="address-line1"
                placeholder="House number and street"
              />
              {fieldErrors.line1 && <small>{fieldErrors.line1}</small>}
            </label>

            <label className="co-field co-span-2">
              <span>Apartment, building or landmark</span>
              <input
                className={fieldErrors.line2 ? 'has-error' : ''}
                name="line2"
                value={address.line2}
                onChange={updateAddress}
                autoComplete="address-line2"
                placeholder="Optional"
              />
              {fieldErrors.line2 && <small>{fieldErrors.line2}</small>}
            </label>

            <label className="co-field">
              <span>City</span>
              <input
                className={fieldErrors.city ? 'has-error' : ''}
                name="city"
                value={address.city}
                onChange={updateAddress}
                autoComplete="address-level2"
                placeholder="Manila"
              />
              {fieldErrors.city && <small>{fieldErrors.city}</small>}
            </label>

            <label className="co-field">
              <span>Province</span>
              <input
                className={fieldErrors.province ? 'has-error' : ''}
                name="province"
                value={address.province}
                onChange={updateAddress}
                autoComplete="address-level1"
                placeholder="Metro Manila"
              />
              {fieldErrors.province && (
                <small>{fieldErrors.province}</small>
              )}
            </label>
          </div>

          <div className="coupon-box">
            <label className="co-field">
              <span>Coupon code</span>
              <input
                className={fieldErrors.couponCode ? 'has-error' : ''}
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase());
                  setFieldErrors((current) => ({
                    ...current,
                    couponCode: undefined,
                  }));
                }}
                placeholder="Optional coupon"
                maxLength="40"
              />
              {fieldErrors.couponCode && (
                <small>{fieldErrors.couponCode}</small>
              )}
            </label>
            <p>The final coupon discount is verified by the server.</p>
          </div>

          <button
            className="co-submit"
            type="submit"
            disabled={submitting || !cart.can_checkout || !online}
            title={online ? undefined : OFFLINE_HINT}
          >
            {submitting ? 'Creating order…' : 'Place order securely'}
          </button>
          {!online && <p className="offline-hint">{OFFLINE_HINT}</p>}

          <p className="checkout-note">
            Your price, coupon, stock and shipping fee are recalculated by the
            server before the order is created.
          </p>
        </form>

        <aside className="co-card order-summary-card">
          <span className="eyebrow">ORDER SUMMARY</span>
          <h2>{cart.item_count} item(s)</h2>

          <div className="checkout-items">
            {cart.items.map((item) => (
              <div className="checkout-item" key={item.product_id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>Qty {item.quantity}</span>
                </div>
                <strong>{peso(item.line_total_centavos)}</strong>
              </div>
            ))}
          </div>

          <div className="summary-lines">
            <div>
              <span>Subtotal</span>
              <strong>{peso(subtotal)}</strong>
            </div>
            <div>
              <span>Estimated shipping</span>
              <strong>
                {estimatedShipping === 0
                  ? 'FREE'
                  : peso(estimatedShipping)}
              </strong>
            </div>
            <div className="summary-total">
              <span>Estimated total</span>
              <strong>{peso(estimatedTotal)}</strong>
            </div>
          </div>

          <p className="summary-disclaimer">
            A coupon can change the shipping fee and final total. The amount
            displayed after placing the order is authoritative.
          </p>
        </aside>
      </div>
    </main>
  );
}