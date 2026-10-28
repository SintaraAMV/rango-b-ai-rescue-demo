'use strict';

const path = require('path');
const express = require('express');
const db = require('./db');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');

async function createApp() {
  await db.open();

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/orders', ordersRouter);
  app.use('/api/customers', customersRouter);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
  });

  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Error interno del servidor' : err.message });
  });

  return app;
}

module.exports = { createApp };
