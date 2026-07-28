import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SqliteSessionStore } from './session-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';
import favoriteRoutes from './routes/favorites.js';
import homeRoutes from './routes/home.js';
import vibeRoutes from './routes/vibe.js';
import couponRoutes from './routes/coupons.js';
import deliveryRoutes from './routes/delivery.js';

const IS_PREVIEW_BACKEND = process.env.VIBE_PREVIEW_BACKEND === '1';

const app = express();

app.use(cors({ origin: true, credentials: true }));
// vibe 上传主图+素材图为 base64 JSON，需较大 body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态托管本地商品图片（无预览 cookie 时；有 cookie 时由 CC Entry 转到沙盒）
app.use('/images', express.static(join(__dirname, '..', 'public', 'images'), {
  maxAge: '7d',
  immutable: true,
}));

// 主站只保留进入 Entry Vibe 工作台的 launcher。
app.get('/vibe-launcher.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(join(__dirname, '..', '..', 'client', 'public', 'vibe-launcher.js'));
});

app.use(session({
  name: 'dop.sid',
  secret: 'dopamine-shop-secret-key',
  store: new SqliteSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    sameSite: 'lax',
  },
}));

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, preview: IS_PREVIEW_BACKEND }));

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/vibe', vibeRoutes);

// 错误处理
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || '服务器错误' });
});

// Shop-only slot: pages are served by CC Entry → active Vite.
// Do not mount gateway or proxyMainSite here.

const PORT = process.env.PORT || 4011;
const server = app.listen(PORT, () => {
  const label = IS_PREVIEW_BACKEND ? '预览后端' : 'Dopamine Shop（槽位，无网关）';
  console.log(`\n🛍️  ${label}已启动: http://localhost:${PORT}\n`);
  if (!IS_PREVIEW_BACKEND) {
    console.log(`   对外入口请访问 CC Entry :4001；本进程仅商城 API / vibe 业务\n`);
  }
});

void server;
