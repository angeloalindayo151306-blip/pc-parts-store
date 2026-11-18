export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a className="brand" href="/">PC<span>PARTS</span></a>
        <div className="nav-actions">
          <button className="btn">Login</button>
          <button className="btn btn-primary">Cart</button>
        </div>
      </div>
    </header>
  );
}