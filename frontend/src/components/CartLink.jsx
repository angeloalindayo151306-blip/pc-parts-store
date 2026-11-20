import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function CartLink() {
  const { count } = useCart();
  return (
    <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
      🛒
      {count > 0 && <span className="cart-badge">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}