// 从 Pexels 按关键词拉取真实商品图，下载到 server/public/images/，并更新数据库
// 用法: node src/seedImages.js
// 可用 PEXELS_API_KEY 环境变量覆盖默认 key
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'public', 'images');
const API_KEY = process.env.PEXELS_API_KEY || 'GK9EZc5NqxX6MTXve0624r4xfFKYRqoKafDpT03oKDdsZB64RKqYzWO3';

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// 商品标题 → Pexels 搜索关键词映射（英文，Pexels 内容以英文为主）
const KEYWORD_MAP = [
  ['T恤', 'white t-shirt'],
  ['阔腿裤', 'wide leg pants'],
  ['托特包', 'canvas tote bag'],
  ['小白鞋', 'white sneakers'],
  ['围巾', 'wool scarf'],
  ['精华液', 'serum skincare bottle'],
  ['洁面乳', 'face cleanser tube'],
  ['口红', 'lipstick cosmetics'],
  ['水乳', 'skincare lotion bottle'],
  ['耳机', 'wireless earbuds'],
  ['充电宝', 'power bank'],
  ['手环', 'fitness tracker'],
  ['音箱', 'bluetooth speaker'],
  ['咖啡豆', 'coffee beans bag'],
  ['坚果', 'mixed nuts bowl'],
  ['辣条', 'snack food'],
  ['车厘子', 'fresh cherries'],
  ['懒人沙发', 'floor sofa cushion'],
  ['枕头', 'memory foam pillow'],
  ['加湿器', 'humidifier'],
  ['床品', 'bedding set'],
  ['纸尿裤', 'baby diapers'],
  ['积木', 'building blocks toys'],
  ['毛绒', 'plush teddy toy'],
  ['瑜伽垫', 'yoga mat'],
  ['跳绳', 'jump rope'],
  ['水壶', 'water bottle'],
  ['人间值得', 'open book'],
  ['中性笔', 'pen stationery'],
  ['手账', 'notebook journal'],
];

function keywordFor(title) {
  for (const [kw, q] of KEYWORD_MAP) {
    if (title.includes(kw)) return q;
  }
  return 'product';
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { Authorization: API_KEY, 'User-Agent': 'dopamine-shop-seed/1.0' },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Pexels API ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dopamine-shop-seed/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`download ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function searchPhotos(query, perPage = 4) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=square`;
  const r = await fetchJson(url);
  return (r.photos || []).map(p => ({
    id: p.id,
    url: p.src.large2x || p.src.large || p.src.original,
    alt: p.alt,
  }));
}

async function main() {
  const products = db.prepare('SELECT id, title, category_id FROM products ORDER BY id ASC').all();
  const cats = Object.fromEntries(db.prepare('SELECT id, name FROM categories').all().map(c => [c.id, c.name]));
  console.log(`[seedImages] 共 ${products.length} 个商品待处理\n`);

  const updateP = db.prepare('UPDATE products SET cover = ?, images = ? WHERE id = ?');
  let ok = 0, fail = 0;

  for (const p of products) {
    const query = keywordFor(p.title);
    try {
      const photos = await searchPhotos(query, 4);
      if (!photos.length) {
        console.log(`✗ #${p.id} "${p.title}" 无结果 (${query})`);
        fail++;
        continue;
      }
      const localPaths = [];
      for (let i = 0; i < photos.length; i++) {
        const ph = photos[i];
        const dest = path.join(IMG_DIR, `p${p.id}_${i}.jpg`);
        if (!fs.existsSync(dest)) {
          await download(ph.url, dest);
        }
        localPaths.push(`/images/p${p.id}_${i}.jpg`);
      }
      updateP.run(localPaths[0], JSON.stringify(localPaths), p.id);
      console.log(`✓ #${p.id} "${p.title}" → ${query} (${photos.length}图)`);
      ok++;
      // 礼貌间隔，避免触发限流
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`✗ #${p.id} "${p.title}" 失败: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n[seedImages] 完成: 成功 ${ok}, 失败 ${fail}`);
  console.log(`图片目录: ${IMG_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
