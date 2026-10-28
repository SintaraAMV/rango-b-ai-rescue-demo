'use strict';

const { createApp } = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;

createApp()
  .then((app) => {
    app.listen(PORT, () => {
      console.log(`OrderDesk escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo iniciar OrderDesk:', err);
    process.exit(1);
  });
