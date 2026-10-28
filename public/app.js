(function () {
  'use strict';

  const view = document.getElementById('view');
  const state = { order: null };
  const toastEl = document.getElementById('toast');

  const STATUS_LABELS = {
    new: 'Nuevo',
    confirmed: 'Confirmado',
    shipped: 'Enviado',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  const NEXT_STATUS = { new: 'confirmed', confirmed: 'shipped', shipped: 'completed' };
  const NEXT_LABEL = {
    confirmed: 'Confirmar pedido',
    shipped: 'Marcar como enviado',
    completed: 'Marcar como completado',
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(n) {
    return '$' + Number(n || 0).toFixed(2);
  }

  function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString('es-CO') : '';
  }

  function badge(status) {
    return `<span class="badge ${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
  }

  let toastTimer = null;
  function toast(message, isError) {
    toastEl.textContent = message;
    toastEl.className = 'toast' + (isError ? ' error' : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 3500);
  }

  async function api(path, options = {}) {
    const init = { method: options.method || 'GET', headers: {} };
    if (options.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(path, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error de comunicación con el servidor');
    return data;
  }

  /* ---------- lista de pedidos ---------- */

  const listFilters = { status: '', q: '' };

  async function renderList() {
    view.innerHTML = '<p class="muted">Cargando…</p>';
    const params = new URLSearchParams();
    if (listFilters.status) params.set('status', listFilters.status);
    if (listFilters.q) params.set('q', listFilters.q);
    const orders = await api(`/api/orders${params.toString() ? `?${params}` : ''}`);
    const rows = orders
      .map(
        (o) => `<tr class="clickable" data-id="${o.id}">
          <td>${esc(o.number)}</td>
          <td>${esc(o.customer_name)}</td>
          <td>${badge(o.status)}</td>
          <td class="num">${o.item_count}</td>
          <td class="num">${money(o.total)}</td>
          <td>${formatDate(o.created_at)}</td>
        </tr>`
      )
      .join('');
    view.innerHTML = `
      <div class="page-head">
        <h1>Pedidos</h1>
        <a class="btn primary" href="#/orders/new">Nuevo pedido</a>
      </div>
      <form id="filters" class="filters">
        <input id="f-q" type="search" placeholder="Buscar por número o cliente" value="${esc(listFilters.q)}">
        <select id="f-status">
          <option value="">Todos los estados</option>
          ${Object.keys(STATUS_LABELS)
            .map(
              (key) =>
                `<option value="${key}"${listFilters.status === key ? ' selected' : ''}>${STATUS_LABELS[key]}</option>`
            )
            .join('')}
        </select>
        <button type="submit">Filtrar</button>
      </form>
      <table>
        <thead><tr>
          <th>Número</th><th>Cliente</th><th>Estado</th>
          <th class="num">Ítems</th><th class="num">Total</th><th>Fecha</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="muted">No hay pedidos.</td></tr>'}</tbody>
      </table>`;
    view.querySelector('#filters').addEventListener('submit', (ev) => {
      ev.preventDefault();
      listFilters.q = view.querySelector('#f-q').value.trim();
      listFilters.status = view.querySelector('#f-status').value;
      renderList();
    });
    view.querySelectorAll('tr.clickable').forEach((tr) => {
      tr.addEventListener('click', () => {
        location.hash = `#/orders/${tr.dataset.id}`;
      });
    });
  }

  /* ---------- detalle de pedido ---------- */

  async function renderDetail(id) {
    view.innerHTML = '<p class="muted">Cargando…</p>';
    const order = await api(`/api/orders/${id}`);
    state.order = order;
    const itemRows = order.items
      .map(
        (it) => `<tr>
          <td>${esc(it.sku)}</td>
          <td>${esc(it.description)}</td>
          <td class="num">${it.quantity}</td>
          <td class="num">${money(it.unit_price)}</td>
          <td class="num">${money(it.line_total)}</td>
        </tr>`
      )
      .join('');
    view.innerHTML = `
      <div class="page-head">
        <h1>Pedido ${esc(order.number)} <span id="status-slot"></span></h1>
        <div class="actions" id="actions-slot"></div>
      </div>
      <div class="card">
        <dl class="meta">
          <div><dt>Cliente</dt><dd>${esc(order.customer_name)}</dd></div>
          <div><dt>Contacto</dt><dd>${esc(order.customer_email || '—')}</dd></div>
          <div><dt>Ítems</dt><dd>${order.item_count}</dd></div>
          <div><dt>Total</dt><dd>${money(order.total)}</dd></div>
          <div><dt>Creado</dt><dd>${formatDate(order.created_at)}</dd></div>
        </dl>
      </div>
      <div class="card">
        <h2>Notas</h2>
        <p>${order.notes ? esc(order.notes) : '<span class="muted">Sin notas.</span>'}</p>
      </div>
      <div class="card">
        <h2>Ítems</h2>
        <table>
          <thead><tr><th>SKU</th><th>Descripción</th><th class="num">Cant.</th>
            <th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p class="summary">${order.item_count} unidades · <strong>Total ${money(order.total)}</strong></p>
      </div>`;

    const statusSlot = view.querySelector('#status-slot');
    const actionsSlot = view.querySelector('#actions-slot');

    function showStatus(status) {
      const next = NEXT_STATUS[status];
      const editable = status === 'new' || status === 'confirmed';
      statusSlot.innerHTML = badge(status);
      actionsSlot.innerHTML = `
        ${next ? `<button class="primary" data-act="advance">${NEXT_LABEL[next]}</button>` : ''}
        ${editable ? `<a class="btn" href="#/orders/${order.id}/edit">Editar</a>` : ''}
        ${editable ? '<button class="danger" data-act="cancel">Cancelar pedido</button>' : ''}`;
      const advanceBtn = actionsSlot.querySelector('[data-act="advance"]');
      if (advanceBtn) advanceBtn.addEventListener('click', () => changeStatus(next));
      const cancelBtn = actionsSlot.querySelector('[data-act="cancel"]');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (confirm('¿Cancelar este pedido?')) changeStatus('cancelled');
        });
      }
    }

    async function changeStatus(target) {
      try {
        const updated = await api(`/api/orders/${order.id}/status`, {
          method: 'PATCH',
          body: { status: target },
        });
        state.order = updated;
        toast('Estado actualizado');
        showStatus(updated.status);
      } catch (err) {
        toast(err.message, true);
      }
    }

    showStatus(order.status);
  }

  /* ---------- alta y edición de pedido ---------- */

  function blankLine() {
    return { sku: '', description: '', quantity: 1, unit_price: 0 };
  }

  function calcTotals(lines) {
    return {
      total: lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
      count: lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    };
  }

  async function renderOrderForm(orderId) {
    const customers = await api('/api/customers');
    const order = orderId
      ? await api(`/api/orders/${orderId}`)
      : null;
    if (order) state.order = order;
    const lines = order ? order.items.map((it) => ({ ...it })) : [blankLine()];
    view.innerHTML = `
      <div class="page-head"><h1>${order ? `Editar pedido ${esc(order.number)}` : 'Nuevo pedido'}</h1></div>
      <form id="order-form" class="card">
        <div class="field">
          <label for="customer">Cliente</label>
          <select id="customer" required>
            <option value="">Seleccione…</option>
            ${customers
              .map(
                (c) =>
                  `<option value="${c.id}"${order && order.customer_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label for="notes">Notas</label>
          <textarea id="notes" rows="2">${order ? esc(order.notes) : ''}</textarea>
        </div>
        <h2>Ítems</h2>
        <table class="lines">
          <thead><tr><th>SKU</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th></th></tr></thead>
          <tbody id="lines"></tbody>
        </table>
        <p><button type="button" id="add-line">Agregar línea</button></p>
        <p class="summary" id="preview"></p>
        <div class="actions">
          <button type="submit" class="primary">${order ? 'Guardar cambios' : 'Crear pedido'}</button>
          <a class="btn" href="${order ? `#/orders/${order.id}` : '#/'}">Volver</a>
        </div>
      </form>`;

    const body = view.querySelector('#lines');
    const preview = view.querySelector('#preview');

    function updatePreview() {
      const t = calcTotals(lines);
      preview.textContent = `${t.count} unidades · Total ${money(t.total)}`;
    }

    function drawLines() {
      body.innerHTML = lines
        .map(
          (l, i) => `<tr data-i="${i}">
            <td><input data-f="sku" value="${esc(l.sku)}"></td>
            <td><input data-f="description" value="${esc(l.description)}" required></td>
            <td><input data-f="quantity" type="number" min="1" step="1" value="${l.quantity}"></td>
            <td><input data-f="unit_price" type="number" min="0" step="0.01" value="${l.unit_price}"></td>
            <td><button type="button" data-remove="${i}">Quitar</button></td>
          </tr>`
        )
        .join('');
      updatePreview();
    }

    body.addEventListener('input', (ev) => {
      const tr = ev.target.closest('tr');
      if (!tr) return;
      lines[Number(tr.dataset.i)][ev.target.dataset.f] = ev.target.value;
      updatePreview();
    });
    body.addEventListener('click', (ev) => {
      const idx = ev.target.dataset.remove;
      if (idx === undefined) return;
      lines.splice(Number(idx), 1);
      if (!lines.length) lines.push(blankLine());
      drawLines();
    });
    view.querySelector('#add-line').addEventListener('click', () => {
      lines.push(blankLine());
      drawLines();
    });
    drawLines();

    view.querySelector('#order-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const payload = {
        customer_id: Number(view.querySelector('#customer').value),
        notes: view.querySelector('#notes').value,
        items: lines.map((l) => ({
          sku: l.sku,
          description: l.description,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        })),
      };
      try {
        if (order) {
          await api(`/api/orders/${order.id}`, { method: 'PUT', body: payload });
          toast('Pedido actualizado');
          location.hash = `#/orders/${order.id}`;
        } else {
          const created = await api('/api/orders', { method: 'POST', body: payload });
          toast(`Pedido ${created.number} creado`);
          location.hash = `#/orders/${created.id}`;
        }
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  /* ---------- clientes ---------- */

  async function renderCustomers() {
    const customers = await api('/api/customers');
    const rows = customers
      .map(
        (c) => `<tr>
          <td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td>
          <td class="num">${c.order_count}</td>
        </tr>`
      )
      .join('');
    view.innerHTML = `
      <div class="page-head"><h1>Clientes</h1></div>
      <table>
        <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th class="num">Pedidos</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <form id="customer-form" class="card" style="margin-top:16px">
        <h2>Nuevo cliente</h2>
        <div class="grid2">
          <div class="field"><label>Nombre</label><input id="c-name" required></div>
          <div class="field"><label>Email</label><input id="c-email" type="email"></div>
        </div>
        <div class="field"><label>Teléfono</label><input id="c-phone"></div>
        <button class="primary" type="submit">Guardar cliente</button>
      </form>`;
    view.querySelector('#customer-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        await api('/api/customers', {
          method: 'POST',
          body: {
            name: view.querySelector('#c-name').value,
            email: view.querySelector('#c-email').value,
            phone: view.querySelector('#c-phone').value,
          },
        });
        toast('Cliente guardado');
        renderCustomers();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  /* ---------- router ---------- */

  async function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    try {
      let m;
      if (hash === '/') await renderList();
      else if (hash === '/orders/new') await renderOrderForm();
      else if ((m = hash.match(/^\/orders\/(\d+)$/))) await renderDetail(Number(m[1]));
      else if ((m = hash.match(/^\/orders\/(\d+)\/edit$/))) await renderOrderForm(Number(m[1]));
      else if (hash === '/customers') await renderCustomers();
      else view.innerHTML = '<p class="muted">Página no encontrada.</p>';
    } catch (err) {
      view.innerHTML = `<p class="muted">${esc(err.message)}</p>`;
    }
  }

  window.addEventListener('hashchange', route);
  route();
})();
