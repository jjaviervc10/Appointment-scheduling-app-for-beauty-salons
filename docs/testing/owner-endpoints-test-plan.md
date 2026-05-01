# Plan de pruebas — Endpoints de la dueña (Owner)

> **Estado**: Pendiente de implementación.  
> Este documento describe los endpoints que deben crearse en la Fase 2 del desarrollo, junto con los casos de prueba recomendados para cada uno.

---

## Prerequisitos

| Requisito | Detalle |
|---|---|
| Auth de dueña | JWT con rol `owner` (vía Supabase Auth o middleware propio) |
| Datos de prueba | Al menos 1 cita `pending_owner_approval`, 1 cliente, 1 servicio activo |
| Variables de entorno | `TEST_OWNER_TOKEN=<jwt>` para smoke tests automatizados |

---

## Endpoints a implementar y probar

---

### `GET /api/owner/appointments/today`

**Objetivo**: Listar todas las citas del día actual.

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros | Ninguno (el día se calcula en el servidor según zona horaria configurada) |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin header `Authorization` | `401` |
| 2 | Token inválido | `Authorization: Bearer token-falso` | `401` |
| 3 | Éxito sin citas hoy | Token válido, no hay citas hoy | `200`, array vacío |
| 4 | Éxito con citas | Token válido, hay citas hoy | `200`, array con objetos `appointment` |
| 5 | Citas de otros días no aparecen | Token válido | `200`, solo citas de hoy |

---

### `GET /api/owner/appointments/pending`

**Objetivo**: Listar citas con estado `pending_owner_approval`.

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros | Ninguno |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin header `Authorization` | `401` |
| 2 | Éxito sin pendientes | Token válido | `200`, array vacío |
| 3 | Éxito con pendientes | Token válido, hay citas pendientes | `200`, array con citas |
| 4 | Solo devuelve `pending_owner_approval` | Token válido | `200`, no incluye `confirmed` ni `cancelled` |

---

### `POST /api/owner/appointments/:id/approve`

**Objetivo**: Cambiar estado de una cita a `confirmed`.

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros de ruta | `:id` — UUID de la cita |
| Efecto secundario | Crear evento `appointment_confirmed` en `notification_events` |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | ID inválido (no UUID) | `:id = "abc"` | `400` |
| 3 | Cita inexistente | UUID válido pero no existe | `404` |
| 4 | Éxito | Cita en `pending_owner_approval` | `200`, estado → `confirmed` |
| 5 | Ya confirmada | Cita ya en `confirmed` | `409` o `422` (transición inválida) |
| 6 | Cita cancelada | Intentar aprobar cita `cancelled` | `409` o `422` |

---

### `POST /api/owner/appointments/:id/reject`

**Objetivo**: Cambiar estado de una cita a `rejected`.

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros de ruta | `:id` — UUID de la cita |
| Body opcional | `{ "reason": "string" }` — motivo del rechazo |
| Efecto secundario | Crear evento `appointment_rejected` en `notification_events` |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | ID inválido | `:id = "not-uuid"` | `400` |
| 3 | Cita inexistente | UUID válido pero no existe | `404` |
| 4 | Éxito sin reason | Cita pendiente, sin `reason` en body | `200` |
| 5 | Éxito con reason | Cita pendiente, `reason: "Sin disponibilidad"` | `200` |
| 6 | Cita ya rechazada | Reintentar rechazar | `409` o `422` |

---

### `POST /api/owner/appointments/:id/cancel`

**Objetivo**: Cancelar una cita confirmada (o pendiente).

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros de ruta | `:id` — UUID de la cita |
| Body opcional | `{ "reason": "string" }` |
| Efecto secundario | Crear evento `appointment_cancelled` en `notification_events` |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | Cita inexistente | UUID no existe | `404` |
| 3 | Éxito desde `pending` | Cita en `pending_owner_approval` | `200` |
| 4 | Éxito desde `confirmed` | Cita en `confirmed` | `200` |
| 5 | Cita ya cancelada | Reintentar cancelar | `409` o `422` |
| 6 | Cita completada | Intentar cancelar `completed` | `409` o `422` |

---

### `POST /api/owner/appointments/:id/complete`

**Objetivo**: Marcar una cita como completada.

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros de ruta | `:id` — UUID de la cita |
| Restricción de negocio | Solo se puede completar una cita `confirmed` cuya `start_at` ya pasó |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | Cita inexistente | UUID no existe | `404` |
| 3 | Cita pendiente | Estado `pending_owner_approval` | `422` (no se puede completar sin confirmar) |
| 4 | Cita futura confirmada | `start_at` en el futuro | `422` (aún no ocurrió) |
| 5 | Éxito | Cita `confirmed` en el pasado | `200` |
| 6 | Ya completada | Reintentar | `409` o `422` |

---

### `GET /api/owner/clients`

**Objetivo**: Listar todos los clientes registrados.

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros opcionales | `?search=<nombre o teléfono>`, `?page=<n>`, `?limit=<n>` |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | Éxito lista completa | Token válido | `200`, array de clientes |
| 3 | Búsqueda por nombre | `?search=Juan` | `200`, solo clientes que coinciden |
| 4 | Búsqueda por teléfono | `?search=+52614` | `200`, clientes con ese prefijo |
| 5 | Sin resultados | `?search=ZZZ999` | `200`, array vacío |

---

### `GET /api/owner/services`

**Objetivo**: Listar servicios (activos e inactivos).

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Parámetros opcionales | `?active=true/false` |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | Lista todos | Sin parámetros | `200`, incluye activos e inactivos |
| 3 | Solo activos | `?active=true` | `200`, solo servicios activos |
| 4 | Solo inactivos | `?active=false` | `200`, solo servicios inactivos |

---

### `GET /api/owner/messages`

**Objetivo**: Listar eventos de notificación pendientes de envío (para la mini app o webhooks).

| Campo | Detalle |
|---|---|
| Rol requerido | `owner` |
| Fuente de datos | Tabla `booking.notification_events` con `status = 'pending'` |

**Casos de prueba**:

| # | Caso | Entrada | Respuesta esperada |
|---|---|---|---|
| 1 | Sin token | Sin `Authorization` | `401` |
| 2 | Éxito | Token válido | `200`, array de eventos pendientes |
| 3 | Sin mensajes pendientes | Todos procesados | `200`, array vacío |

---

## Flujo de prueba end-to-end recomendado

1. `POST /api/public-booking/request` → crear cita (status: `pending_owner_approval`)
2. `GET /api/owner/appointments/pending` → verificar que aparece
3. `POST /api/owner/appointments/:id/approve` → confirmar
4. `GET /api/owner/appointments/today` → verificar que aparece como `confirmed`
5. `POST /api/owner/appointments/:id/complete` → completar (si start_at ya pasó)
6. `GET /api/owner/clients` → verificar que el cliente fue creado
7. `GET /api/owner/messages` → verificar eventos de notificación generados

---

## Notas para implementación

- **Auth middleware**: Debe verificar JWT y adjuntar el usuario al `req` de Express antes de llegar al controller.
- **Transiciones de estado**: Implementar una función utilitaria `isValidTransition(from, to)` para evitar duplicar lógica de validación.
- **Eventos de notificación**: Siempre fire-and-forget (no bloquear la respuesta si falla el insert de evento).
- **Paginación**: Implementar desde el inicio para `GET /api/owner/clients` — la lista puede crecer.
