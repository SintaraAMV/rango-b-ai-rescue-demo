'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { seedDatabase } = require('./seed');

const DATA_FILE = process.env.ORDERDESK_DB || path.join(__dirname, '..', 'data', 'orderdesk.sqlite');

const SCHEMA = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  total REAL NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_items_order ON order_items(order_id);
`;

let db = null;

function save() {
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, DATA_FILE);
}

async function open() {
  const SQL = await initSqlJs();
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  if (fs.existsSync(DATA_FILE)) {
    db = new SQL.Database(fs.readFileSync(DATA_FILE));
    db.run('PRAGMA foreign_keys = ON');
    return;
  }

  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(SCHEMA);
  seedDatabase({ run, lastId });
  save();
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
}

function lastId() {
  return get('SELECT last_insert_rowid() AS id').id;
}

function transaction(fn) {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    save();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

module.exports = { open, all, get, run, lastId, transaction, DATA_FILE };
