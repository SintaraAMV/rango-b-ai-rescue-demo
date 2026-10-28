'use strict';

const db = require('./db');
const { HttpError } = require('./http-error');

function listCustomers() {
  return db.all(
    `SELECT c.id, c.name, c.email, c.phone, c.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
       FROM customers c
      ORDER BY c.name`
  );
}

function createCustomer(body) {
  const name = String(body.name || '').trim();
  if (!name) throw new HttpError(400, 'El nombre del cliente es obligatorio');
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const id = db.transaction(() => {
    db.run('INSERT INTO customers (name, email, phone, created_at) VALUES (?, ?, ?, ?)', [
      name,
      email,
      phone,
      new Date().toISOString(),
    ]);
    return db.lastId();
  });
  return db.get('SELECT id, name, email, phone, created_at FROM customers WHERE id = ?', [id]);
}

module.exports = { listCustomers, createCustomer };
