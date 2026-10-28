# OrderDesk

Aplicación web interna para gestionar pedidos de clientes: registrar pedidos con sus ítems,
consultarlos, editarlos y seguir su estado hasta la entrega.

## Qué hace

- **Pedidos**: listado con búsqueda por número o cliente y filtro por estado.
- **Detalle de pedido**: cliente, notas, ítems con cantidades y precios, total y estado.
- **Alta y edición**: formulario para crear pedidos y para modificar cliente, notas e ítems de los pedidos
  que todavía no han sido enviados.
- **Estados**: `Nuevo → Confirmado → Enviado → Completado`. Un pedido nuevo o confirmado puede cancelarse.
- **Clientes**: listado y alta rápida de clientes.
- **Persistencia**: base de datos SQLite (vía `sql.js`, sin compilación nativa) guardada en un archivo local.

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
```

Abrir <http://localhost:3000> en el navegador.

Variables de entorno opcionales:

| Variable        | Por defecto                | Descripción                          |
| --------------- | -------------------------- | ------------------------------------ |
| `PORT`          | `3000`                     | Puerto HTTP                          |
| `ORDERDESK_DB`  | `data/orderdesk.sqlite`    | Ruta del archivo de base de datos    |

En el primer arranque se crea la base de datos y se cargan datos de ejemplo (clientes y pedidos
sintéticos). Para volver a empezar con datos de ejemplo:

```bash
npm run reset   # elimina el archivo de base de datos
npm start       # lo vuelve a crear con los datos de ejemplo
```

## API REST

| Método | Ruta                      | Descripción                                    |
| ------ | ------------------------- | ---------------------------------------------- |
| GET    | `/api/orders`             | Lista de pedidos (`?status=` y `?q=`)          |
| GET    | `/api/orders/:id`         | Detalle de un pedido con sus ítems             |
| POST   | `/api/orders`             | Crea un pedido (`customer_id`, `notes`, `items`) |
| PUT    | `/api/orders/:id`         | Edita un pedido                                |
| PATCH  | `/api/orders/:id/status`  | Cambia el estado (`{ "status": "confirmed" }`) |
| GET    | `/api/customers`          | Lista de clientes                              |
| POST   | `/api/customers`          | Crea un cliente                                |

## Estructura

```
server.js            arranque del servidor
src/app.js           configuración de Express
src/db.js            acceso a SQLite (sql.js) y persistencia en archivo
src/seed.js          datos de ejemplo
src/orders.js        lógica de pedidos
src/customers.js     lógica de clientes
src/routes/          rutas de la API
public/              interfaz (HTML, CSS y JavaScript)
scripts/reset.js     reinicia la base de datos local
```
