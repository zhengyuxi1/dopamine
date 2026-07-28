import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  let timer = null;

  const show = useCallback((text, ms = 1600) => {
    setMsg(text);
    clearTimeout(timer);
    timer = setTimeout(() => setMsg(null), ms);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
