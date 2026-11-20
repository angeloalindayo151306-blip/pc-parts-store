import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function AddToCartButton({ product }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | busy | added
  const [error, setError] = useState('');
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const out = product.stock <= 0;

  async function onClick() {
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
        disabled={out || status === 'busy'}
      >
        {label}
      </button>
      {error && <span className="atc-error">{error}</span>}
    </div>
  );
}