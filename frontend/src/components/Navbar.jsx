import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="brand" to="/">PC<span>PARTS</span></Link>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">Login</Link>
              <Link className="btn btn-primary" to="/register">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}