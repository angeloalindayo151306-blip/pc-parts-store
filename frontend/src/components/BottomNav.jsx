import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const tabClass = ({ isActive }) => `bn-tab${isActive ? ' active' : ''}`;

export default function BottomNav() {
  const { user } = useAuth();
  const { count } = useCart();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink className={tabClass} to="/" end>
        <span className="bn-icon" aria-hidden="true">🏠</span>
        <span className="bn-label">Store</span>
      </NavLink>

      <NavLink className={tabClass} to="/cart" aria-label={`Cart, ${count} items`}>
        <span className="bn-icon" aria-hidden="true">
          🛒
          {count > 0 && <span className="bn-badge">{count > 99 ? '99+' : count}</span>}
        </span>
        <span className="bn-label">Cart</span>
      </NavLink>

      {user ? (
        <NavLink className={tabClass} to="/orders">
          <span className="bn-icon" aria-hidden="true">📦</span>
          <span className="bn-label">Orders</span>
        </NavLink>
      ) : (
        <NavLink className={tabClass} to="/login">
          <span className="bn-icon" aria-hidden="true">👤</span>
          <span className="bn-label">Log in</span>
        </NavLink>
      )}
    </nav>
  );
}