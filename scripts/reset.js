'use strict';

const fs = require('fs');
const path = require('path');

const file = process.env.ORDERDESK_DB || path.join(__dirname, '..', 'data', 'orderdesk.sqlite');

if (fs.existsSync(file)) {
  fs.unlinkSync(file);
  console.log(`Base de datos eliminada: ${file}`);
} else {
  console.log('No hay base de datos que eliminar.');
}
console.log('Se volverá a crear con datos de ejemplo en el próximo arranque (npm start).');
