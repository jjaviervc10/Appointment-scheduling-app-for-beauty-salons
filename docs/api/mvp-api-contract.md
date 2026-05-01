# MVP API Contract

Contrato HTTP para conectar el frontend del MVP de Jaquelina Lopez Barber Studio con el backend Express.

Este documento describe los endpoints existentes. No define features nuevas.

## Base URL

Local:

```text
http://localhost:3000
```

Frontend:

```ts
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL
```

Produccion futura:

```text
https://<railway-app>.up.railway.app
```

## Auth

### Public endpoints

No requieren login ni bearer token.

### Owner endpoints

Requieren:

```http
Authorization: Bearer <OWNER_SECRET>
```

En desarrollo local el token actual es:

```text
dev-owner-secret
```

No enviar `SUPABASE_SERVICE_ROLE_KEY` al frontend. Nunca debe vivir en app movil, navegador ni Postman compartido.

## Error Format

Errores conocidos:

```json
{
  "ok": false,
  "error": "Mensaje seguro para mostrar o mapear en UI"
}
```

Errores de validacion:

```json
{
  "ok": false,
  "error": "Error de validacion",
  "details": {
    "phone": ["phone invalido: usa formato internacional (ej: +526141234567)"]
  }
}
```

## Status Codes

| Status | Significado | Uso frontend |
|---|---|---|
| `200` | OK | Continuar flujo normal. |
| `400` | Request invalido | Mostrar errores de formulario. |
| `401` | Owner token faltante o incorrecto | Redirigir a login/admin auth local. |
| `404` | Recurso no encontrado | Mostrar estado vacio o mensaje. |
| `409` | Conflicto de horario/estado | Pedir elegir otro horario o refrescar datos. |
| `413` | Payload demasiado grande | Reducir notas/body. |
| `422` | Regla de negocio invalida | Mostrar mensaje de negocio. |
| `429` | Rate limit | Mostrar "intenta mas tarde". |
| `500` | Error interno | Mostrar error generico y reportar logs. |

## Data Notes

- `startAt` en requests publicos es el slot visible para el cliente.
- `requestedStartAt` y `requestedEndAt` en responses incluyen buffers del servicio.
- Para `Corte clasico`, si el cliente elige `10:15`, el backend puede guardar `10:10` a `10:50` por buffer de 5 min antes/despues.
- Los slots deben usar ISO 8601 con timezone offset, por ejemplo `2026-06-04T10:15:00-06:00`.
- Los minutos deben caer en granularidad de 15: `00`, `15`, `30`, `45`.

---

# Endpoints

## GET /health

Health check del backend.

### Auth

No requerida.

### Headers

Ninguno especial.

### Body

No aplica.

### Success 200

```json
{
  "ok": true,
  "service": "jl-barber-backend",
  "timestamp": "2026-04-27T01:19:24.190Z"
}
```

### Expected Errors

No hay errores de negocio esperados.

### curl

```bash
curl http://localhost:3000/health
```

---

## POST /api/public-booking/request

Crea una solicitud publica de cita en estado `pending_owner_approval`.

### Auth

No requerida.

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "fullName": "[TEST] Usuario Prueba",
  "phone": "+526149999998",
  "serviceId": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
  "startAt": "2026-06-04T10:15:00-06:00",
  "notes": "[TEST] Prueba desde frontend"
}
```

### Validation

| Campo | Regla |
|---|---|
| `fullName` | string, trim, min 2, max 100 |
| `phone` | se normaliza removiendo espacios, guiones, parentesis y puntos; regex `^\+?[1-9]\d{7,14}$` |
| `serviceId` | UUID |
| `startAt` | ISO 8601 con timezone offset |
| `startAt` | minuto `00`, `15`, `30` o `45` |
| `notes` | opcional, trim, max 500 |
| `token` | opcional, reservado para fase futura |

### Success 200

```json
{
  "ok": true,
  "appointment": {
    "id": "2c53f1f3-d0a4-4b0e-a5d2-330f3778c29b",
    "status": "pending_owner_approval",
    "requestedStartAt": "2026-06-04T10:10:00-06:00",
    "requestedEndAt": "2026-06-04T10:50:00-06:00"
  },
  "client": {
    "fullName": "[TEST] Usuario Prueba",
    "phone": "+526149999998"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Body invalido, telefono invalido, `serviceId` no UUID, `startAt` sin timezone, minuto invalido, `notes` > 500 |
| `404` | Servicio no existe o esta inactivo |
| `409` | Horario no disponible, solapamiento o slot fuera de disponibilidad real con buffers |
| `413` | Body mayor a `20kb` |
| `422` | Cita con menos de 30 minutos de anticipacion |
| `429` | Rate limit del endpoint publico |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/public-booking/request \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "[TEST] Usuario Prueba",
    "phone": "+526149999998",
    "serviceId": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
    "startAt": "2026-06-04T10:15:00-06:00",
    "notes": "[TEST] Prueba desde frontend"
  }'
```

---

## GET /api/owner/appointments/pending

Lista citas pendientes de aprobacion por la owner.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Body

No aplica.

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "2c53f1f3-d0a4-4b0e-a5d2-330f3778c29b",
      "status": "pending_owner_approval",
      "requested_start_at": "2026-06-04T10:10:00-06:00",
      "requested_end_at": "2026-06-04T10:50:00-06:00",
      "notes": "[TEST] Prueba desde frontend",
      "cancellation_reason": null,
      "created_at": "2026-04-26T19:20:00.000000-06:00",
      "clients": {
        "id": "client-uuid",
        "full_name": "[TEST] Usuario Prueba",
        "phone": "+526149999998"
      },
      "services": {
        "id": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
        "name": "Corte clasico",
        "duration_minutes": 30
      }
    }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl http://localhost:3000/api/owner/appointments/pending \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/appointments/today

Lista citas del dia actual segun zona horaria de negocio.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Body

No aplica.

### Success 200

Mismo formato que `GET /api/owner/appointments/pending`:

```json
{
  "ok": true,
  "data": []
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl http://localhost:3000/api/owner/appointments/today \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/clients

Lista clientes activos con busqueda y paginacion.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Query Params

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `search` | string | none | Busca por `full_name` o `phone` |
| `page` | number | `1` | Minimo 1 |
| `limit` | number | `50` | Maximo 100 |

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "client-uuid",
      "full_name": "[TEST] Usuario Prueba",
      "phone": "+526149999998",
      "created_at": "2026-04-26T19:20:00.000000-06:00",
      "last_seen_at": "2026-04-26T19:20:00.000000-06:00"
    }
  ],
  "total": 1
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/clients?search=%5BTEST%5D&page=1&limit=20" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/services

Lista servicios.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Query Params

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `active` | `true` / `false` | none | Si se omite, devuelve activos e inactivos |

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
      "name": "Corte clasico",
      "duration_minutes": 30,
      "buffer_before_minutes": 5,
      "buffer_after_minutes": 5,
      "is_active": true
    }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/services?active=true" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/messages

Lista eventos de notificacion pendientes.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Body

No aplica.

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "event-uuid",
      "event_type": "appointment_requested",
      "appointment_id": "appointment-uuid",
      "client_id": "client-uuid",
      "payload": {
        "appointment_id": "appointment-uuid"
      },
      "scheduled_for": null,
      "status": "pending"
    }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl http://localhost:3000/api/owner/messages \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## POST /api/owner/appointments/:id/approve

Aprueba una cita pendiente.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `booking.appointments` |

### Body

No requiere body.

```json
{}
```

### Success 200

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "confirmed_by_owner",
    "requested_start_at": "2026-06-04T10:10:00-06:00",
    "requested_end_at": "2026-06-04T10:50:00-06:00"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID |
| `401` | Token owner faltante o incorrecto |
| `404` | Cita no encontrada |
| `422` | La cita no esta en `pending_owner_approval` |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/owner/appointments/<appointment-id>/approve \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## POST /api/owner/appointments/:id/reject

Rechaza una cita pendiente.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `booking.appointments` |

### Body

```json
{
  "reason": "[TEST] Rechazo manual"
}
```

`reason` es opcional.

### Success 200

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "rejected_by_owner",
    "requested_start_at": "2026-06-04T10:10:00-06:00",
    "requested_end_at": "2026-06-04T10:50:00-06:00"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID |
| `401` | Token owner faltante o incorrecto |
| `404` | Cita no encontrada |
| `422` | La cita no esta en `pending_owner_approval` |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/owner/appointments/<appointment-id>/reject \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{"reason":"[TEST] Rechazo manual"}'
```

---

## POST /api/owner/appointments/:id/cancel

Cancela una cita pendiente o confirmada por la owner.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `booking.appointments` |

### Body

```json
{
  "reason": "[TEST] Cancelacion manual"
}
```

`reason` es opcional.

### Success 200

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "owner_cancelled",
    "requested_start_at": "2026-06-04T10:10:00-06:00",
    "requested_end_at": "2026-06-04T10:50:00-06:00"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID |
| `401` | Token owner faltante o incorrecto |
| `404` | Cita no encontrada |
| `422` | La cita no esta en `pending_owner_approval` ni `confirmed_by_owner` |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/owner/appointments/<appointment-id>/cancel \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{"reason":"[TEST] Cancelacion manual"}'
```

---

## POST /api/owner/appointments/:id/complete

Marca una cita confirmada como completada.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `booking.appointments` |

### Body

No requiere body.

```json
{}
```

### Success 200

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "completed",
    "requested_start_at": "2026-06-04T10:10:00-06:00",
    "requested_end_at": "2026-06-04T10:50:00-06:00"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID |
| `401` | Token owner faltante o incorrecto |
| `404` | Cita no encontrada |
| `422` | La cita no esta confirmada o aun no ha ocurrido |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/owner/appointments/<appointment-id>/complete \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

# MVP Flow

## 1. Cliente solicita cita

Frontend llama:

```http
POST /api/public-booking/request
```

Resultado:

- Se crea o reutiliza cliente por `phone`.
- Si el cliente ya existe, no se pisa `full_name`.
- Se crea cita en `pending_owner_approval`.
- Se crea un `notification_event` `appointment_requested`.

## 2. Owner ve pendientes

Frontend owner llama:

```http
GET /api/owner/appointments/pending
Authorization: Bearer <OWNER_SECRET>
```

Resultado:

- Devuelve citas pendientes con cliente y servicio.

## 3. Owner aprueba o rechaza

Aprobar:

```http
POST /api/owner/appointments/:id/approve
```

Estado final:

```text
confirmed_by_owner
```

Rechazar:

```http
POST /api/owner/appointments/:id/reject
```

Estado final:

```text
rejected_by_owner
```

## 4. Owner cancela

```http
POST /api/owner/appointments/:id/cancel
```

Permitido desde:

- `pending_owner_approval`
- `confirmed_by_owner`

Estado final:

```text
owner_cancelled
```

## 5. Owner completa

```http
POST /api/owner/appointments/:id/complete
```

Permitido desde:

- `confirmed_by_owner`

Regla:

- La cita debe haber ocurrido; citas futuras devuelven `422`.

Estado final:

```text
completed
```

---

# Frontend Integration Notes

## Base URL

Usar variable de entorno:

```ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
```

Ejemplo local:

```text
http://localhost:3000
```

## Error handling recomendado

```ts
const response = await fetch(`${API_BASE_URL}/api/public-booking/request`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const json = await response.json()

if (!response.ok) {
  switch (response.status) {
    case 400:
      // Mostrar errores de formulario; revisar json.details si existe.
      break
    case 401:
      // Owner no autorizado.
      break
    case 404:
      // Servicio/cita no encontrada.
      break
    case 409:
      // Slot ocupado o transicion conflictiva.
      break
    case 422:
      // Regla de negocio.
      break
    case 429:
      // Rate limit.
      break
    default:
      // 500 u otros.
      break
  }
}
```

## Owner token

Para rutas owner:

```ts
await fetch(`${API_BASE_URL}/api/owner/appointments/pending`, {
  headers: {
    Authorization: `Bearer ${OWNER_SECRET}`,
  },
})
```

Para MVP local, `OWNER_SECRET` puede venir de config segura de desarrollo. Para produccion, no hardcodear el secreto en clientes publicos.

## Public booking body builder

```ts
const payload = {
  fullName,
  phone,
  serviceId,
  startAt, // ISO con offset: 2026-06-04T10:15:00-06:00
  notes,
}
```

## Slot display

Mostrar al cliente el `startAt` visible. No mostrar `requestedStartAt` como hora de inicio de servicio si incluye buffer previo.

## Postman

Archivos disponibles:

- `docs/postman/jl-barber-backend.postman_collection.json`
- `docs/postman/jl-barber-backend.local.postman_environment.json`

La coleccion incluye:

- Health
- Public Booking
- Owner endpoints

El environment incluye:

- `baseUrl`
- `ownerToken`
- `serviceId`
- IDs de servicios semilla
- variables de prueba para citas y filtros

---

# Endpoint Summary

| Metodo | Ruta | Auth |
|---|---|---|
| `GET` | `/health` | No |
| `POST` | `/api/public-booking/request` | No |
| `GET` | `/api/owner/appointments/pending` | Owner bearer |
| `GET` | `/api/owner/appointments/today` | Owner bearer |
| `GET` | `/api/owner/clients` | Owner bearer |
| `GET` | `/api/owner/services` | Owner bearer |
| `GET` | `/api/owner/messages` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/approve` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/reject` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/cancel` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/complete` | Owner bearer |
