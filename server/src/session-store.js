import { Store } from 'express-session';
import db from './db.js';

const TTL_MS = 1000 * 60 * 60 * 24 * 30;

const getStmt = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?');
const setStmt = db.prepare(`
  INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
  ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired
`);
const destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
const touchStmt = db.prepare('UPDATE sessions SET expired = ? WHERE sid = ?');
const purgeStmt = db.prepare('DELETE FROM sessions WHERE expired <= ?');

/** 跨 orchestrator / 预览后端的共享 Session 存储 */
export class SqliteSessionStore extends Store {
  constructor() {
    super();
    this._purge();
    this._timer = setInterval(() => this._purge(), 60 * 60 * 1000);
    this._timer.unref?.();
  }

  _purge() {
    try {
      purgeStmt.run(Date.now());
    } catch {}
  }

  get(sid, cb) {
    try {
      const row = getStmt.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (e) {
      cb(e);
    }
  }

  set(sid, sess, cb) {
    try {
      const maxAge = sess.cookie?.maxAge ?? TTL_MS;
      setStmt.run(sid, JSON.stringify(sess), Date.now() + maxAge);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }

  destroy(sid, cb) {
    try {
      destroyStmt.run(sid);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }

  touch(sid, sess, cb) {
    try {
      const maxAge = sess.cookie?.maxAge ?? TTL_MS;
      touchStmt.run(Date.now() + maxAge, sid);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
}
