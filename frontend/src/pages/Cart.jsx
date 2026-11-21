import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import {
  OFFLINE_HINT,
  useNetworkStatus,
} from '../context/NetworkStatusContext.jsx';
import { peso, categoryIcon } from '../utils/format.js';

function issueText(i) {
  if (i.issue === 'UNAVAILABLE') return 'No longer available. Please remove it.';
  if (i.issue === 'OUT_OF_STOCK') return 'Out of stock. Please remove it.';
  if (i.issue === 'INSUFFICIENT_STOCK') return `Only ${i.stock} left in stock.`;
  return '';
}

export default function Cart() {
  const { user } = useAuth();
  const { online } = useNetworkStatus();
  const { cart, loading, stale, updateItem, removeItem, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Editing needs the server, so lock the controls offline.
  const locked = busy || !online;
  const offlineTitle = online ? undefined : OFFLINE_HINT;

  async function act(fn) {
    if (!online) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="container cart-page">
        <h1 className="page-title">Your cart</h1>
        <p className="empty">
          Please <Link to="/login">log in</Link> to see your cart.
        </p>
      </main>
    );
  }

  if (loading && !cart) {
    return (
      <main className="container cart-page">
        <h1 className="page-title">Your cart</h1>
        <div className="skeleton detail-skeleton" />
      </main>
    );
  }

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <main className="container cart-page">
        <h1 className="page-title">Your cart</h1>
        <div className="empty">
          <p>Your cart is empty.</p>
          <Link to="/products" className="btn btn-primary">Browse parts</Link>
        </div>
      </main>
    );
  }

  const canCheckout = cart.can_checkout && online && !stale;

  return (
    <main className="container cart-page has-sticky-bar">
      <h1 className="page-title">Your cart</h1>
      {error && <p className="form-error">{error}</p>}
      {stale && (
        <p className="stale-note" role="status">
          Showing your last saved cart. Prices and stock may have changed. It
          updates when you are back online.
        </p>
      )}
      {!online && <p className="offline-hint">{OFFLINE_HINT}</p>}
      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((i) => (
            <li key={i.product_id} className={'cart-line' + (i.issue ? ' has-issue' : '')}>
              <Link to={`/products/${i.product_id}`} className="cart-thumb">
                {i.image_url ? (
                  <img src={i.image_url} alt={i.name} />
                ) : (
                  <span>{categoryIcon(i.category_name)}</span>
                )}
              </Link>
              <div className="cart-info">
                <Link to={`/products/${i.product_id}`} className="cart-name">{i.name}</Link>
                <span className="cart-unit">{peso(i.unit_price_centavos)} each</span>
                {i.issue && (
                  <span className="cart-issue">
                    {issueText(i)}{' '}
                    {i.issue === 'INSUFFICIENT_STOCK' && (
                      <button
                        className="link-btn"
                        disabled={locked}
                        title={offlineTitle}
                        onClick={() => act(() => updateItem(i.product_id, i.stock))}
                      >
                        Set to {i.stock}
                      </button>
                    )}
                  </span>
                )}
              </div>
              <div className="qty">
                <button
                  aria-label="Decrease quantity"
                  disabled={locked || i.quantity <= 1}
                  title={offlineTitle}
                  onClick={() => act(() => updateItem(i.product_id, i.quantity - 1))}
                >
                  −
                </button>
                <span>{i.quantity}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={locked || i.issue === 'UNAVAILABLE' || i.quantity >= Math.min(i.stock, 99)}
                  title={offlineTitle}
                  onClick={() => act(() => updateItem(i.product_id, i.quantity + 1))}
                >
                  +
                </button>
              </div>
              <div className="cart-total">{peso(i.line_total_centavos)}</div>
              <button
                className="link-btn danger"
                disabled={locked}
                title={offlineTitle}
                onClick={() => act(() => removeItem(i.product_id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <aside className="cart-summary">
          <h2>Order summary</h2>
          <div className="sum-row">
            <span>Items</span>
            <span>{cart.item_count}</span>
          </div>
          <div className="sum-row sum-total">
            <span>Subtotal</span>
            <span>{peso(cart.subtotal_centavos)}</span>
          </div>
          <p className="sum-note">Shipping and discounts are calculated at checkout.</p>
          {!cart.can_checkout && (
            <p className="form-error">Fix the highlighted items before checking out.</p>
          )}
          <button
            className="link-btn danger"
            disabled={locked}
            title={offlineTitle}
            onClick={() => act(clear)}
          >
            Clear cart
          </button>
        </aside>
      </div>
      <div className="sticky-bar">
        <div className="sticky-bar-info">
          <span>Subtotal</span>
          <strong>{peso(cart.subtotal_centavos)}</strong>
        </div>
        <div className="sticky-bar-action">
          {canCheckout ? (
            <Link to="/checkout" className="btn btn-primary">
              Checkout
            </Link>
          ) : (
            <button
              className="btn btn-primary"
              disabled
              title={offlineTitle}
            >
              {cart.can_checkout ? 'Checkout' : 'Fix cart issues'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}