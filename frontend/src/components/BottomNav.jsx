import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const tabClass = ({ isActive }) => `bn-tab${isActive ? ' active' : ''}`;

export default function BottomNav() {
  const { user } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();

  // Store tab covers the landing page, the catalog and product details
  const storeActive = pathname === '/' || pathname.startsWith('/products');

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link
        className={`bn-tab${storeActive ? ' active' : ''}`}
        to="/"
        aria-current={storeActive ? 'page' : undefined}
      >
        <span className="bn-icon" aria-hidden="true">🏠</span>
        <span className="bn-label">Store</span>
      </Link>

      <NavLink className={tabClass} to="/ai-assistant" aria-label="Build assistant">
        <span className="bn-icon" aria-hidden="true">🤖</span>
        <span className="bn-label">Build</span>
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