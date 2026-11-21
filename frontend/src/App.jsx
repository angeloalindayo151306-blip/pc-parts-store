import { Link, Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import TopBar from './components/TopBar.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import MockCheckout from './pages/MockCheckout.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Orders from './pages/Orders.jsx';
import PaymentReturn from './pages/PaymentReturn.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Register from './pages/Register.jsx';
import Products from './pages/Products.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <TopBar />
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/payment/success" element={<PaymentReturn variant="success" />} />
          <Route path="/payment/cancelled" element={<PaymentReturn variant="cancelled" />} />
          {import.meta.env.DEV && (
            <Route path="/mock-checkout/:sessionId" element={<MockCheckout />} />
          )}
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
        <BottomNav />
      </div>
    </div>
  );
}