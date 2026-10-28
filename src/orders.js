'use strict';

const db = require('./db');
const { HttpError } = require('./http-error');

const STATUS_FLOW = ['new', 'confirmed', 'shipped', 'completed'];
const STATUSES = [...STATUS_FLOW, 'cancelled'];
const EDITABLE_STATUSES = ['new', 'confirmed'];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function summarize(items) {
  return {
    total: round2(items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)),
    item_count: items.reduce((sum, it) => sum + it.quantity, 0),
  };
}

function cleanItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpError(400, 'El pedido necesita al menos un ítem');
  }
  return raw.map((it) => {
    const quantity = Number(it.quantity);
    const unitPrice = Number(it.unit_price);
    const description = String(it.description || '').trim();
    if (!description) throw new HttpError(400, 'Cada ítem necesita una descripción');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, 'La cantidad debe ser un entero mayor que cero');
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError(400, 'El precio unitario no es válido');
    }
    return { sku: String(it.sku || '').trim(), description, quantity, unit_price: unitPrice };
  });
}

function loadItems(orderId) {
  return db.all(
    'SELECT id, sku, description, quantity, unit_price FROM order_items WHERE order_id = ? ORDER BY id',
    [orderId]
  );
}

function listOrders({ status, q } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (q) {
    where.push('(o.number LIKE ? OR c.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  return db.all(
    `SELECT o.id, o.number, o.customer_id, c.name AS customer_name, o.status, o.notes,
            o.total, o.item_count, o.created_at, o.updated_at
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY o.id DESC`,
    params
  );
}

function getOrder(id) {
  const order = db.get(
    `SELECT o.id, o.number, o.customer_id, c.name AS customer_name, c.email AS customer_email,
            o.status, o.notes, o.total, o.item_count, o.created_at, o.updated_at
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?`,
    [id]
  );
  if (!order) throw new HttpError(404, 'Pedido no encontrado');
  order.items = loadItems(id).map((it) => ({
    ...it,
    line_total: round2(it.quantity * it.unit_price),
  }));
  const summary = summarize(order.items);
  order.total = summary.total;
  order.item_count = summary.item_count;
  return order;
}

function nextNumber() {
  const row = db.get('SELECT COALESCE(MAX(id), 0) AS maxId FROM orders');
  return `OD-${1001 + row.maxId}`;
}

function createOrder(body) {
  const customerId = Number(body.customer_id);
  const customer = db.get('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (!customer) throw new HttpError(400, 'Cliente no válido');
  const items = cleanItems(body.items);
  const summary = summarize(items);
  const notes = String(body.notes || '').trim();
  const now = new Date().toISOString();

  const id = db.transaction(() => {
    db.run(
      `INSERT INTO orders (number, customer_id, status, notes, total, item_count, created_at, updated_at)
       VALUES (?, ?, 'new', ?, ?, ?, ?, ?)`,
      [nextNumber(), customerId, notes, summary.total, summary.item_count, now, now]
    );
    const orderId = db.lastId();
    items.forEach((it) => {
      db.run(
        'INSERT INTO order_items (order_id, sku, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [orderId, it.sku, it.description, it.quantity, it.unit_price]
      );
    });
    return orderId;
  });
  return getOrder(id);
}

function readOrderInput(body, current) {
  const items = cleanItems(body.items);
  const summary = summarize(items);
  const status = body.status || current.status;
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Estado no válido');
  return {
    customerId: Number(body.customer_id === undefined ? current.customer_id : body.customer_id),
    status,
    notes: String(body.notes === undefined ? current.notes : body.notes).trim(),
    total: body.total === undefined ? summary.total : Number(body.total),
    itemCount: body.item_count === undefined ? summary.item_count : Number(body.item_count),
    items,
  };
}

function updateOrder(id, body) {
  const current = db.get('SELECT id, customer_id, status, notes FROM orders WHERE id = ?', [id]);
  if (!current) throw new HttpError(404, 'Pedido no encontrado');
  if (!EDITABLE_STATUSES.includes(current.status)) {
    throw new HttpError(409, 'Este pedido ya no se puede editar');
  }

  const input = readOrderInput(body, current);
  const customer = db.get('SELECT id FROM customers WHERE id = ?', [input.customerId]);
  if (!customer) throw new HttpError(400, 'Cliente no válido');

  db.transaction(() => {
    db.run(
      `UPDATE orders
          SET customer_id = ?, status = ?, notes = ?, total = ?, item_count = ?, updated_at = ?
        WHERE id = ?`,
      [input.customerId, input.status, input.notes, input.total, input.itemCount, new Date().toISOString(), id]
    );
    db.run('DELETE FROM order_items WHERE order_id = ?', [id]);
    input.items.forEach((it) => {
      db.run(
        'INSERT INTO order_items (order_id, sku, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [id, it.sku, it.description, it.quantity, it.unit_price]
      );
    });
  });
  return getOrder(id);
}

function checkOrderSummary(order) {
  const live = summarize(loadItems(order.id));
  if (live.item_count !== order.item_count || Math.abs(live.total - order.total) > 0.005) {
    throw new HttpError(409, 'No se pudo actualizar el estado del pedido');
  }
}

function advanceStatus(id, target) {
  const order = db.get('SELECT id, status, total, item_count FROM orders WHERE id = ?', [id]);
  if (!order) throw new HttpError(404, 'Pedido no encontrado');
  if (!STATUSES.includes(target)) throw new HttpError(400, 'Estado no válido');

  const current = STATUS_FLOW.indexOf(order.status);
  const allowed =
    target === 'cancelled'
      ? current >= 0 && current < STATUS_FLOW.indexOf('shipped')
      : current >= 0 && STATUS_FLOW.indexOf(target) === current + 1;
  if (!allowed) throw new HttpError(409, 'Transición de estado no permitida');
  if (target !== 'cancelled') checkOrderSummary(order);

  db.transaction(() => {
    db.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [
      target,
      new Date().toISOString(),
      id,
    ]);
  });
  return getOrder(id);
}

module.exports = {
  STATUS_FLOW,
  STATUSES,
  summarize,
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  advanceStatus,
};
