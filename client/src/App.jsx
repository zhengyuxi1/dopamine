import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './store/user.jsx';
import { CartProvider } from './store/cart.jsx';
import { ToastProvider } from './store/toast.jsx';
import Tabbar from './components/Tabbar.jsx';

import Home from './pages/Home.jsx';
import Category from './pages/Category.jsx';
import Cart from './pages/Cart.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Search from './pages/Search.jsx';
import SearchResult from './pages/SearchResult.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Addresses from './pages/Addresses.jsx';
import AddressEdit from './pages/AddressEdit.jsx';
import Favorites from './pages/Favorites.jsx';
import Coupons from './pages/Coupons.jsx';
import Settings from './pages/Settings.jsx';
import Messages from './pages/Messages.jsx';
import MessagesChat from './pages/MessagesChat.jsx';
import DeliveryAll from './pages/DeliveryAll.jsx';
import DeliveryShop from './pages/DeliveryShop.jsx';
import Farm from './pages/Farm.jsx';

function Shell({ children }) {
  return <div className="app-shell">{children}<Tabbar /></div>;
}

/** 统一入口下预览站 base 为 /p/{userId}/，需同步给 React Router */
function routerBasename() {
  const base = import.meta.env.BASE_URL || '/';
  if (!base || base === '/') return undefined;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <ToastProvider>
        <UserProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Shell><Home /></Shell>} />
              <Route path="/category" element={<Shell><Category /></Shell>} />
              <Route path="/messages" element={<Shell><Messages /></Shell>} />
              <Route path="/messages/chat" element={<MessagesChat />} />
              <Route path="/cart" element={<Shell><Cart /></Shell>} />
              <Route path="/profile" element={<Shell><Profile /></Shell>} />
              <Route path="/login" element={<Login />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/search/result" element={<SearchResult />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/addresses" element={<Addresses />} />
              <Route path="/addresses/edit" element={<AddressEdit />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/delivery/all" element={<DeliveryAll />} />
              <Route path="/delivery/shop/:id" element={<DeliveryShop />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/farm" element={<Farm />} />
            </Routes>
          </CartProvider>
        </UserProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
