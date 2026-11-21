import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useNetworkStatus } from './NetworkStatusContext.jsx';

const CartContext = createContext(null);
const AUTH_ERRORS = ['UNAUTHENTICATED', 'TOKEN_EXPIRED', 'INVALID_TOKEN'];
const SNAPSHOT_KEY = 'pcparts.cartSnapshot';

// Last cart the server sent us. Display only, never used for pricing.
function readSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeSnapshot(cart) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(cart));
  } catch {
    /* storage full or blocked: ignore */
  }
}
function clearSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}

export function CartProvider({ children }) {
  const { token, logout } = useAuth();
  const { online } = useNetworkStatus();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  // true when the cart on screen is the saved copy, not fresh from the server
  const [stale, setStale] = useState(false);

  // Load the cart when someone logs in, clear it when they log out.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setCart(null);
      setStale(false);
      setLoading(false);
      clearSnapshot();
      return;
    }
    setLoading(true);
    api('/cart', { token })
      .then((c) => {
        if (cancelled) return;
        setCart(c);
        setStale(false);
        writeSnapshot(c);
      })
      .catch((e) => {
        if (cancelled) return;
        if (AUTH_ERRORS.includes(e.code)) {
          logout();
          return;
        }
        // Server unreachable: show the last saved cart, if there is one.
        const saved = readSnapshot();
        if (saved) {
          setCart(saved);
          setStale(true);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  // When the connection comes back, replace the saved copy with the real cart.
  useEffect(() => {
    if (!online || !stale || !token) return;
    let cancelled = false;
    api('/cart', { token })
      .then((c) => {
        if (cancelled) return;
        setCart(c);
        setStale(false);
        writeSnapshot(c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [online, stale, token]);

  const run = useCallback(
    async (path, method, body) => {
      try {
        const c = await api(path, { method, body, token });
        setCart(c);
        setStale(false);
        writeSnapshot(c);
        return c;
      } catch (e) {
        if (AUTH_ERRORS.includes(e.code)) logout();
        throw e;
      }
    },
    [token, logout]
  );

  const value = useMemo(
    () => ({
      cart,
      loading,
      stale,
      count: cart?.item_count ?? 0,
      addItem: (productId, quantity = 1) => run('/cart/items', 'POST', { productId, quantity }),
      updateItem: (productId, quantity) => run(`/cart/items/${productId}`, 'PATCH', { quantity }),
      removeItem: (productId) => run(`/cart/items/${productId}`, 'DELETE'),
      clear: () => run('/cart', 'DELETE'),
      refresh: () => run('/cart', 'GET'),
    }),
    [cart, loading, stale, run]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}