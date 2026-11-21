import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import {
  OFFLINE_HINT,
  useNetworkStatus,
} from '../context/NetworkStatusContext.jsx';

export default function AddToCartButton({ product }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { online } = useNetworkStatus();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | busy | added
  const [error, setError] = useState('');
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const out = product.stock <= 0;

  async function onClick() {
    if (!online) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setStatus('busy');
    try {
      await addItem(product.id, 1);
      setStatus('added');
      timer.current = setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      setStatus('idle');
      setError(e.message);
    }
  }

  const label = out
    ? 'Out of stock'
    : status === 'busy'
    ? 'Adding…'
    : status === 'added'
    ? '✓ Added'
    : 'Add to cart';

  return (
    <div className="atc">
      <button
        className="btn btn-primary"
        onClick={onClick}
        disabled={out || status === 'busy' || !online}
        title={online ? undefined : OFFLINE_HINT}
      >
        {label}
      </button>
      {!online && !out && <span className="atc-error">{OFFLINE_HINT}</span>}
      {online && error && <span className="atc-error">{error}</span>}
    </div>
  );
}