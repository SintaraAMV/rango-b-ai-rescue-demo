'use strict';

const customers = [
  { name: 'Distribuidora Aurora S.A.S.', email: 'compras@aurora.example.com', phone: '555-0101' },
  { name: 'Ferretería Los Cedros', email: 'pedidos@loscedros.example.com', phone: '555-0102' },
  { name: 'Panadería Montecarlo', email: 'admin@montecarlo.example.com', phone: '555-0103' },
  { name: 'Clínica Veterinaria Patitas', email: 'contacto@patitas.example.com', phone: '555-0104' },
  { name: 'Librería El Faro', email: 'ventas@elfaro.example.com', phone: '555-0105' },
  { name: 'Taller Mecánico Ruiz e Hijos', email: 'taller@ruiz.example.com', phone: '555-0106' },
];

const orders = [
  { number:'OD-1001',customer:1,status:'completed',notes:'Entrega en bodega 2.',total:119.1,itemCount:20,createdAt:'2026-03-02T14:10:00Z',items:[{sku:'TOR-100',description:'Tornillos caja x100',quantity:10,unitPrice:4.5},{sku:'CAB-220',description:'Cable eléctrico 10 m',quantity:4,unitPrice:12.9},{sku:'GUA-010',description:'Guantes de trabajo',quantity:6,unitPrice:3.75}]},
  { number:'OD-1002',customer:2,status:'shipped',notes:'Pagar contra entrega.',total:216.2,itemCount:20,createdAt:'2026-03-09T16:25:00Z',items:[{sku:'PIN-501',description:'Pintura blanca 4 L',quantity:6,unitPrice:28},{sku:'CIN-030',description:'Cinta aislante',quantity:12,unitPrice:1.6},{sku:'LLA-014',description:'Llave ajustable 14 pulg',quantity:2,unitPrice:14.5}]},
  { number:'OD-1003',customer:3,status:'confirmed',notes:'Cliente pide factura electrónica.',total:224.2,itemCount:22,createdAt:'2026-03-17T10:05:00Z',items:[{sku:'HAR-001',description:'Harina 25 kg',quantity:8,unitPrice:21},{sku:'EMB-020',description:'Bolsas de empaque x50',quantity:10,unitPrice:2.9},{sku:'CAF-500',description:'Café molido 500 g',quantity:4,unitPrice:6.8}]},
  { number:'OD-1004',customer:4,status:'new',notes:'Confirmar disponibilidad de guantes.',total:45.8,itemCount:11,createdAt:'2026-03-24T09:40:00Z',items:[{sku:'LIM-200',description:'Limpiador multiuso',quantity:6,unitPrice:3.3},{sku:'GUA-010',description:'Guantes de trabajo',quantity:4,unitPrice:3.75},{sku:'PAP-A4',description:'Resma papel A4',quantity:5,unitPrice:5.2}]},
  { number:'OD-1005',customer:5,status:'new',notes:'',total:113.6,itemCount:26,createdAt:'2026-04-01T11:15:00Z',items:[{sku:'PAP-A4',description:'Resma papel A4',quantity:20,unitPrice:5.2},{sku:'CIN-030',description:'Cinta aislante',quantity:6,unitPrice:1.6}]},
  { number:'OD-1006',customer:6,status:'confirmed',notes:'Retira en mostrador.',total:104.7,itemCount:11,createdAt:'2026-04-08T15:30:00Z',items:[{sku:'LLA-014',description:'Llave ajustable 14 pulg',quantity:3,unitPrice:14.5},{sku:'TOR-100',description:'Tornillos caja x100',quantity:5,unitPrice:4.5},{sku:'CAB-220',description:'Cable eléctrico 10 m',quantity:2,unitPrice:12.9}]},
  { number:'OD-1007',customer:1,status:'new',notes:'Urgente, necesitan para el viernes.',total:161,itemCount:30,createdAt:'2026-04-15T08:50:00Z',items:[{sku:'CAB-220',description:'Cable eléctrico 10 m',quantity:10,unitPrice:12.9},{sku:'CIN-030',description:'Cinta aislante',quantity:20,unitPrice:1.6}]},
  { number:'OD-1008',customer:2,status:'completed',notes:'',total:93.5,itemCount:12,createdAt:'2026-04-21T13:00:00Z',items:[{sku:'PIN-501',description:'Pintura blanca 4 L',quantity:2,unitPrice:28},{sku:'GUA-010',description:'Guantes de trabajo',quantity:10,unitPrice:3.75}]},
  { number:'OD-1009',customer:3,status:'cancelled',notes:'Cancelado por el cliente.',total:42,itemCount:2,createdAt:'2026-04-28T17:20:00Z',items:[{sku:'HAR-001',description:'Harina 25 kg',quantity:2,unitPrice:21}]},
  { number:'OD-1010',customer:5,status:'new',notes:'Dejar con recepción.',total:76.4,itemCount:18,createdAt:'2026-05-06T10:45:00Z',items:[{sku:'PAP-A4',description:'Resma papel A4',quantity:10,unitPrice:5.2},{sku:'LIM-200',description:'Limpiador multiuso',quantity:3,unitPrice:3.3},{sku:'EMB-020',description:'Bolsas de empaque x50',quantity:5,unitPrice:2.9}]},
];

function seedDatabase({ run, lastId }) {
  const customerIds = customers.map((c) => {
    run('INSERT INTO customers (name, email, phone, created_at) VALUES (?, ?, ?, ?)', [c.name,c.email,c.phone,'2026-02-20T09:00:00Z']);
    return lastId();
  });
  orders.forEach((o) => {
    run(`INSERT INTO orders (number, customer_id, status, notes, total, item_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,[o.number,customerIds[o.customer-1],o.status,o.notes,o.total,o.itemCount,o.createdAt,o.createdAt]);
    const orderId=lastId();
    o.items.forEach((it)=>run('INSERT INTO order_items (order_id, sku, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',[orderId,it.sku,it.description,it.quantity,it.unitPrice]));
  });
}

module.exports = { seedDatabase };
