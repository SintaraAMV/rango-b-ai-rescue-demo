'use strict';

const express = require('express');
const orders = require('../orders');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(orders.listOrders({ status: req.query.status, q: req.query.q }));
});

router.get('/:id', (req, res) => {
  res.json(orders.getOrder(Number(req.params.id)));
});

router.post('/', (req, res) => {
  res.status(201).json(orders.createOrder(req.body || {}));
});

router.put('/:id', (req, res) => {
  res.json(orders.updateOrder(Number(req.params.id), req.body || {}));
});

router.patch('/:id/status', (req, res) => {
  res.json(orders.advanceStatus(Number(req.params.id), (req.body || {}).status));
});

module.exports = router;
