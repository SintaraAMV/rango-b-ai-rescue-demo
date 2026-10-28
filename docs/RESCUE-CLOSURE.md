# AI App Rescue Demo 01 — Cierre técnico

**Caso:** OrderDesk  
**Fecha:** 2026-10-28  
**Resultado final:** **RECOVERED**  
**Ground Truth:** revelado y comparado después de la intervención.

## Resumen

La demo partió de una aplicación funcional pero degradada por varios blockers relacionados:

1. editar ítems podía dejar `total` e `item_count` persistidos con valores anteriores;
2. esa incoherencia podía bloquear cambios de estado mediante HTTP 409;
3. un `PUT` podía volver a escribir un `status` viejo y revertir una transición válida;
4. existían registros históricos/semilla con resúmenes incoherentes.

La causa común era una autoridad de escritura mal definida entre frontend, campos derivados persistidos y workflow de estado.

## Recuperación aplicada

- El backend recalcula `total` e `item_count` desde `order_items`.
- El backend conserva la autoridad sobre `status`; el `PUT` de edición ya no lo escribe.
- El frontend envía únicamente campos editables.
- El frontend actualiza `state.order` después de cambios de estado.
- El formulario de edición recarga el pedido antes de editar.
- Se añadió `reconcileSummaries()` para corregir datos históricos al arrancar y persistir la reconciliación.
- Se eliminó la dependencia de `checkOrderSummary()` como bloqueo para transiciones válidas.

## AR final

| Criterio | Resultado |
|---|---|
| AR-01 — blockers iniciales reproducidos | PASS |
| AR-02 — flujos afectados recuperados | PASS |
| AR-03 — autoridad/integridad de escritura | PASS |
| AR-04 — regresión relacionada comprobada | PASS |
| AR-05 — control técnico recuperado | PASS |

## Validación ejecutada

Se ejecutó una suite equivalente local sobre la lógica real de `orders.js` y el seed del caso, usando un adaptador SQLite temporal porque el entorno de validación no puede descargar `sql.js` desde npm.

Resultado: **13/13 PASS**.

Cobertura:

- reconciliación histórica detecta y corrige exactamente los registros incoherentes;
- OD-1004 queda en 60.8 / 15;
- OD-1006 queda en 91.8 / 10;
- editar OD-1007 recalcula correctamente 173.90 / 31 tanto en detalle como en lista;
- un `PUT` no puede forzar `status`;
- un pedido editado puede avanzar de estado;
- un payload obsoleto no puede revertir `confirmed → new`;
- una transición inválida continúa devolviendo 409;
- alta de pedido continúa funcionando;
- cancelación continúa funcionando;
- editar solo notas conserva el estado;
- los valores corregidos quedan almacenados en persistencia.

## Comparación con Ground Truth

La solución converge con la arquitectura de referencia revelada por el Oracle:

- ignorar `total`, `item_count` y `status` del payload;
- recalcular campos derivados;
- aislar `status` al endpoint de transición;
- reconciliar datos históricos;
- mantener coherente el estado del frontend;
- preservar los flujos sanos.

## Limitación de validación

El archivo privado del Oracle `verify.js` y sus logs no forman parte del repositorio público, por lo que **no se ejecutó literalmente su suite 25/25** contra esta rama.

No se afirma ese resultado.

En su lugar se ejecutó una suite equivalente de 13 pruebas dirigida específicamente a todos los mecanismos, riesgos de regresión y flujos sanos descritos en el Ground Truth.

## Estado

**RECOVERED**

La aplicación recuperó una autoridad coherente sobre estado y datos derivados sin reescritura general y manteniendo los flujos funcionales principales.

La simulación integral comercial de AI App Rescue continúa siendo una validación separada.
