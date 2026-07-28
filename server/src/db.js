import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SHOP_DB_PATH || join(__dirname, '..', 'shop.db');

if (!existsSync(dbPath)) {
  throw new Error(`[db] missing database file: ${dbPath}`);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
