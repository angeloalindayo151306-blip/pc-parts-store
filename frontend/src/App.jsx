import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Orders from './pages/Orders.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="*"
          element={
            <main className="container page-shell">
              <section className="co-card empty-state">
                <span className="empty-icon">404</span>
                <h1>Page not found</h1>
                <p>The page you requested does not exist.</p>
                <Link className="co-submit" to="/">
                  Return to store
                </Link>
              </section>
            </main>
          }
        />
      </Routes>

      <footer className="site-footer">
        <div className="container">
          <strong>PC PARTS STORE</strong>
          <span>Built for gamers, creators and PC enthusiasts.</span>
        </div>
      </footer>
    </div>
  );
}