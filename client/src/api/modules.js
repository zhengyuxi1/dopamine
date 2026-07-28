import api from './index.js';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const homeApi = {
  get: () => api.get('/home'),
};

export const categoryApi = {
  list: () => api.get('/categories'),
  products: (id, params) => api.get(`/categories/${id}/products`, { params }),
};

export const productApi = {
  list: (params) => api.get('/products', { params }),
  detail: (id) => api.get(`/products/${id}`),
  recommend: () => api.get('/products/recommend/list'),
};

export const cartApi = {
  list: () => api.get('/cart'),
  add: (data) => api.post('/cart', data),
  update: (id, data) => api.put(`/cart/${id}`, data),
  remove: (id) => api.delete(`/cart/${id}`),
  deleteBatch: (ids) => api.post('/cart/delete-batch', { ids }),
  selectAll: (selected) => api.post('/cart/select-all', { selected }),
  count: () => api.get('/cart/count'),
};

export const orderApi = {
  create: (data) => api.post('/orders', data),
  list: (status) => api.get('/orders', { params: { status } }),
  counts: () => api.get('/orders/counts'),
  detail: (id) => api.get(`/orders/${id}`),
  pay: (id) => api.post(`/orders/${id}/pay`),
  ship: (id) => api.post(`/orders/${id}/ship`),
  receive: (id) => api.post(`/orders/${id}/receive`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};

export const addressApi = {
  list: () => api.get('/addresses'),
  create: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  remove: (id) => api.delete(`/addresses/${id}`),
};

export const couponApi = {
  list: () => api.get('/coupons'),
  claim: (id) => api.post(`/coupons/${id}/claim`),
  my: () => api.get('/coupons/my'),
  count: () => api.get('/coupons/count'),
};

export const deliveryApi = {
  shops: () => api.get('/delivery/shops'),
  shopDetail: (id) => api.get(`/delivery/shops/${id}`),
};

export const favoriteApi = {
  list: () => api.get('/favorites'),
  toggle: (productId) => api.post(`/favorites/${productId}`),
  status: (productId) => api.get(`/favorites/${productId}/status`),
};
