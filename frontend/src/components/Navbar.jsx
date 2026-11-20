import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CartLink from './CartLink.jsx';

const navClass = ({ isActive }) =>
  `site-link${isActive ? ' active' : ''}`;

export default function Navbar() {
  const { user, logout } = useAuth();

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'Account';

  return (
    <header className="site-nav">
      <div className="container site-nav-inner">
        <Link className="site-brand" to="/">
          <span className="brand-mark">PC</span>
          <span>
            <strong>PARTS</strong>
            <small>STORE</small>
          </span>
        </Link>

        <nav className="site-links" aria-label="Main navigation">
          <NavLink className={navClass} to="/" end>
            Store
          </NavLink>

          {user && (
            <NavLink className={navClass} to="/orders">
              Orders
            </NavLink>
          )}
        </nav>

        <div className="site-actions">
          {user ? (
            <>
              <CartLink />

              <span className="user-chip">
                <span className="user-dot" />
                {firstName}
              </span>

              <button className="nav-logout" type="button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink className={navClass} to="/login">
                Log in
              </NavLink>
              <Link className="nav-register" to="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}