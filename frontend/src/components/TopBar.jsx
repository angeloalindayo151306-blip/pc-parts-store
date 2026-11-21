import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function TopBar() {
  const { user, logout } = useAuth();
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'Account';

  return (
    <header className="top-bar">
      <Link className="top-brand" to="/" aria-label="PC Parts Store home">
        <span className="brand-mark">PC</span>
        <span className="top-brand-text">
          <strong>PARTS</strong>
          <small>STORE</small>
        </span>
      </Link>
      <div className="top-actions">
        {user ? (
          <>
            <span className="user-chip">
              <span className="user-dot" />
              {firstName}
            </span>
            <button className="top-btn" type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="top-btn" to="/login">
              Log in
            </Link>
            <Link className="top-btn top-btn-primary" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}