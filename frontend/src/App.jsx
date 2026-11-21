import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TopBar from './components/TopBar.jsx';
import Home from './pages/Home.jsx';

const Products = lazy(() => import('./pages/Products.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const OrderDetail = lazy(() => import('./pages/OrderDetail.jsx'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn.jsx'));
const MockCheckout = lazy(() => import('./pages/MockCheckout.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));

function PageFallback() {
  return (
    <main className="container page-shell" aria-busy="true">
      <div className="skeleton detail-skeleton" />
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <TopBar />
        <OfflineBanner />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/payment/success" element={<PaymentReturn variant="success" />} />
            <Route path="/payment/cancelled" element={<PaymentReturn variant="cancelled" />} />
            {import.meta.env.DEV && (
              <Route path="/mock-checkout/:sessionId" element={<MockCheckout />} />
            )}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
            </Route>

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
        </Suspense>
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