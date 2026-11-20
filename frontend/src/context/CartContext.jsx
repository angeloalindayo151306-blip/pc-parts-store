import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);
const AUTH_ERRORS = ['UNAUTHENTICATED', 'TOKEN_EXPIRED', 'INVALID_TOKEN'];

export function CartProvider({ children }) {
  const { token, logout } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load the cart when someone logs in, clear it when they log out.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setCart(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api('/cart', { token })
      .then((c) => !cancelled && setCart(c))
      .catch((e) => {
        if (!cancelled && AUTH_ERRORS.includes(e.code)) logout();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const run = useCallback(
    async (path, method, body) => {
      try {
        const c = await api(path, { method, body, token });
        setCart(c);
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
      count: cart?.item_count ?? 0,
      addItem: (productId, quantity = 1) => run('/cart/items', 'POST', { productId, quantity }),
      updateItem: (productId, quantity) => run(`/cart/items/${productId}`, 'PATCH', { quantity }),
      removeItem: (productId) => run(`/cart/items/${productId}`, 'DELETE'),
      clear: () => run('/cart', 'DELETE'),
      refresh: () => run('/cart', 'GET'),
    }),
    [cart, loading, run]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);