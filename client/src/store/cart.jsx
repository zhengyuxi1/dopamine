import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { cartApi } from '../api/modules.js';
import { useUser } from './user.jsx';

const CartContext = createContext({ count: 0, refresh: () => {} });

export function CartProvider({ children }) {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) { setCount(0); return; }
    try {
      const r = await cartApi.count();
      setCount(r.count);
    } catch {
      setCount(0);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
