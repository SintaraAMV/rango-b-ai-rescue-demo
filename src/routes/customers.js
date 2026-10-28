'use strict';

const express = require('express');
const customers = require('../customers');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(customers.listCustomers());
});

router.post('/', (req, res) => {
  res.status(201).json(customers.createCustomer(req.body || {}));
});

module.exports = router;
