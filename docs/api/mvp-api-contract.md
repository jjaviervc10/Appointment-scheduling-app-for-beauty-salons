# MVP API Contract

Contrato HTTP para conectar el frontend del MVP de Jaquelina Lopez Barber Studio con el backend Express.

Este documento describe los endpoints existentes. No define features nuevas.

## Base URL

Produccion Railway:

```text
https://striking-caring-production.up.railway.app
```

Frontend publicado en Netlify:

```text
https://barberjaquelinalopezstudio.netlify.app
```

Configurar en Netlify la variable que use el framework del frontend con el valor del backend Railway:

```text
API_BASE_URL=https://striking-caring-production.up.railway.app
```

Si el frontend usa Vite, Next, Expo o Create React App, usar el prefijo esperado por cada framework:

```text
VITE_API_BASE_URL=https://striking-caring-production.up.railway.app
NEXT_PUBLIC_API_BASE_URL=https://striking-caring-production.up.railway.app
EXPO_PUBLIC_API_BASE_URL=https://striking-caring-production.up.railway.app
REACT_APP_API_BASE_URL=https://striking-caring-production.up.railway.app
```

Local backend:

```text
http://localhost:3000
```

Frontend runtime:

```ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
```

Nota para CORS:

```text
CORS_ORIGIN=https://barberjaquelinalopezstudio.netlify.app
```

`CORS_ORIGIN` vive en Railway y debe apuntar al dominio del frontend sin slash final.

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

No usar `SUPABASE_URL` como base URL de las llamadas HTTP del frontend. El frontend llama al backend Express en Railway; Railway usa Supabase internamente.

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

## Messaging Architecture

- `booking.outbound_messages` es la cola real para futuros envios WhatsApp.
- `booking.notification_events` es solo auditoria/eventos internos.
- Ningun worker futuro debe enviar WhatsApp desde `notification_events`.
- La integracion WhatsApp opera en modo dry-run por defecto (`WHATSAPP_DRY_RUN=true`).
- Los mensajes nuevos quedan en `outbound_messages.delivery_status = 'pending'`.
- El dedupe de mensajes accionables se aplica en aplicacion y en DB para `pending`/`queued`.
- `booking.inbound_messages` guarda todos los mensajes recibidos desde WhatsApp.
- La clasificacion de intento es por patrones de texto, sin IA.
- El owner puede leer mensajes inbound con `GET /api/owner/inbound-messages`.
- La lectura del owner se guarda en `inbound_messages.read_at`.
- Las respuestas automaticas del bot se registran en `inbound_messages.bot_replied_at`
  y se vinculan al `outbound_message_id` generado.

---

# Production Request Examples

Base productiva:

```text
https://striking-caring-production.up.railway.app
```

Health:

```http
GET https://striking-caring-production.up.railway.app/health
```

Servicios publicos:

```http
GET https://striking-caring-production.up.railway.app/api/public/services
```

Disponibilidad publica:

```http
GET https://striking-caring-production.up.railway.app/api/public/availability?serviceId=<service-id>&weekStart=2026-06-01
```

Crear solicitud publica de cita:

```http
POST https://striking-caring-production.up.railway.app/api/public-booking/request
Content-Type: application/json
```

```json
{
  "fullName": "Cliente Prueba",
  "phone": "+526141234567",
  "serviceId": "<service-id>",
  "startAt": "2026-06-04T10:15:00-06:00",
  "notes": "Opcional"
}
```

Listar solicitudes pendientes owner:

```http
GET https://striking-caring-production.up.railway.app/api/owner/appointments/pending
Authorization: Bearer <OWNER_SECRET>
```

Listar citas en espera de confirmacion/reprogramacion owner:

```http
GET https://striking-caring-production.up.railway.app/api/owner/appointments/awaiting
Authorization: Bearer <OWNER_SECRET>
```

Leer ajustes del negocio owner:

```http
GET https://striking-caring-production.up.railway.app/api/owner/settings
Authorization: Bearer <OWNER_SECRET>
```

Disponibilidad semanal del negocio (owner):

```http
GET https://striking-caring-production.up.railway.app/api/owner/weekly-availability
Authorization: Bearer <OWNER_SECRET>
```

Crear bloqueo de horario (owner):

```http
POST https://striking-caring-production.up.railway.app/api/owner/time-blocks
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

```json
{
  "blockType": "comida",
  "reason": "Comida",
  "isRecurring": false,
  "specificDate": "2026-06-04",
  "dayOfWeek": null,
  "startTime": "13:00",
  "endTime": "14:00"
}
```

Disponibilidad efectiva de una semana especifica (owner):

```http
GET https://striking-caring-production.up.railway.app/api/owner/weekly-availability?week_start_date=2026-05-11
Authorization: Bearer <OWNER_SECRET>
```

Actualizar disponibilidad semanal (owner):

```http
PUT https://striking-caring-production.up.railway.app/api/owner/weekly-availability
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

Actualizar overrides de una semana especifica (owner):

```http
PUT https://striking-caring-production.up.railway.app/api/owner/weekly-availability?week_start_date=2026-05-11
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

Borrar overrides de una semana especifica (owner):

```http
DELETE https://striking-caring-production.up.railway.app/api/owner/weekly-availability?week_start_date=2026-05-11
Authorization: Bearer <OWNER_SECRET>
```

Reprogramar cita desde owner:

```http
POST https://striking-caring-production.up.railway.app/api/owner/appointments/<appointment-id>/reschedule
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

```json
{
  "newStartAt": "2026-06-04T10:15:00-06:00",
  "reason": "Cambio solicitado por la clienta",
  "notifyClient": true
}
```

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

### Mensajes generados

Cada solicitud exitosa genera automaticamente (fire-and-forget, falla silenciosa):

| Tabla | Campo | Valor |
|---|---|---|
| `notification_events` | `event_type` | `appointment_requested` |
| `outbound_messages` | `message_type` | `confirmation` |
| `outbound_messages` | `delivery_status` | `pending` |
| `outbound_messages` | `body` | `Hola {{nombre}}, recibimos tu solicitud de cita para {{servicio}}. La revisaremos y te confirmaremos pronto.` |

**Deduplicacion**: si ya existe un mensaje `confirmation` + `pending` para la misma cita en los ultimos 2 minutos, no se crea duplicado.

---

## GET /api/public/services

Lista servicios activos disponibles para mostrar en la mini app o booking cliente.

### Auth

No requerida.

### Headers

Ninguno especial.

### Body

No aplica.

### Catalogo oficial de servicios (Mayo 2026)

El dueno del negocio definio el catalogo oficial. Los servicios activos deben ser exactamente estos en el orden indicado:

| sort_order | name | description | duration_minutes |
|---|---|---|---|
| 1 | Corte | Servicio base para adulto | 30 |
| 2 | Corte y Barba | Combo: corte + arreglo de barba | 50 |
| 3 | Corte Infantil | Para ninos — duracion menor | 20 |
| 4 | Delineado Cabello | Perfilado/delineado de cabello | 20 |
| 5 | Delineado Barba | Perfilado/delineado de barba | 20 |
| 6 | Depilacion Oidos y Nariz | Servicio de grooming | 15 |
| 7 | Camuflaje de Canas | Tecnica de coloracion/camuflaje | 40 |
| 8 | Mascarillas | Tratamiento de mascarillas faciales/capilares | 30 |

Notas de migracion:
- Cualquier servicio previo que no figure en esta lista debe quedar con `is_active = false`.
- El campo `price` queda en `NULL` hasta que el dueno defina precios oficiales.
- `buffer_before_minutes = 0`, `buffer_after_minutes = 5` para todos.

### Success 200

```json
{
  "ok": true,
  "services": [
    {
      "id": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
      "name": "Corte",
      "description": "Servicio base para adulto",
      "durationMinutes": 30,
      "price": null,
      "sortOrder": 1
    },
    {
      "id": "uuid-corte-y-barba",
      "name": "Corte y Barba",
      "description": "Combo: corte + arreglo de barba",
      "durationMinutes": 50,
      "price": null,
      "sortOrder": 2
    }
  ]
}
```

### Notas

- Solo devuelve servicios `is_active = true`.
- Ordenado por `sort_order` ascendente, luego por `name` ascendente.
- No expone campos internos (`created_by`, `updated_by`, `created_at`, `updated_at`, buffers).
- El frontend renderiza los nombres tal cual vienen del API — no hay mapeo hardcoded en el cliente.
- El frontend soporta multi-seleccion de servicios por persona (flujo familiar).

### Expected Errors

| Status | Causa |
|---|---|
| `429` | Rate limit (60 req / 15 min por IP) |
| `500` | Error interno |

### curl

```bash
curl http://localhost:3000/api/public/services
```

---

## GET /api/public/availability

Devuelve slots disponibles para un servicio en una semana dada, calculados via RPC `booking.get_available_slots`.
La RPC respeta los overrides semanales guardados por el owner en `booking.weekly_availability_overrides`.

### Auth

No requerida.

### Headers

Ninguno especial.

### Body

No aplica.

### Query Params

| Param | Tipo | Requerido | Notas |
|---|---|---|---|
| `serviceId` | UUID | Si | UUID del servicio activo |
| `weekStart` | string | Si | Lunes de la semana en formato `YYYY-MM-DD` |

### Success 200

```json
{
  "ok": true,
  "slots": [
    {
      "slotStartAt": "2026-06-01T10:00:00-06:00",
      "slotEndAt": "2026-06-01T10:30:00-06:00"
    }
  ]
}
```

`slots` es un array vacio `[]` si no hay disponibilidad para esa semana.

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `serviceId` no es UUID valido, `weekStart` no tiene formato `YYYY-MM-DD`, o falta algun parametro |
| `404` | Servicio no encontrado o inactivo |
| `429` | Rate limit (60 req / 15 min por IP) |
| `500` | Error interno (incluyendo negocio sin configuracion en `business_settings`) |

### curl

```bash
curl "http://localhost:3000/api/public/availability?serviceId=0f8057a3-f6ec-4c19-b065-6dbf27391cc5&weekStart=2026-06-01"
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
        "name": "Corte",
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

## GET /api/owner/appointments/awaiting

Lista citas en estados intermedios que ya fueron procesadas por la owner pero
siguen esperando confirmacion del cliente o nueva fecha.

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
      "id": "appointment-uuid",
      "status": "awaiting_client_confirmation",
      "requested_start_at": "2026-06-10T09:55:00-06:00",
      "requested_end_at": "2026-06-10T10:35:00-06:00",
      "notes": null,
      "cancellation_reason": "Cambio solicitado por la clienta",
      "created_at": "2026-05-09T18:20:00.000000-06:00",
      "clients": {
        "id": "client-uuid",
        "full_name": "Cliente Prueba",
        "phone": "+526149999998"
      },
      "services": {
        "id": "service-uuid",
        "name": "Corte",
        "duration_minutes": 30
      }
    }
  ]
}
```

### Notas

- Devuelve solo citas con status `awaiting_client_confirmation` o `reschedule_required`.
- Ordenado por `requested_start_at` ascendente.
- Sin paginacion, igual que `GET /api/owner/appointments/pending`.

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl http://localhost:3000/api/owner/appointments/awaiting \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/appointments

Lista citas en un rango de fechas para alimentar agenda/calendario del panel owner.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Query Params

| Param | Tipo | Requerido | Notas |
|---|---|---|---|
| `startDate` | `YYYY-MM-DD` | Si | Fecha local inicial |
| `endDate` | `YYYY-MM-DD` | Si | Fecha local final |
| `status` | appointment status | No | Si se omite, excluye estados cerrados |

Reglas:

- `startDate` y `endDate` deben ser fechas reales.
- `startDate <= endDate`.
- Rango maximo: 45 dias.
- Sin `status`, se excluyen `completed`, `no_show`, `client_cancelled`, `owner_cancelled`, `rejected_by_owner`.

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "appointment-uuid",
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
        "name": "Corte",
        "duration_minutes": 30
      }
    }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Query invalido, fecha inexistente, `startDate > endDate`, rango > 45 dias, status invalido |
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/appointments?startDate=2026-06-01&endDate=2026-06-07" \
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
      "last_seen_at": "2026-04-26T19:20:00.000000-06:00",
      "totalAppointments": 12,
      "lastAppointmentAt": "2026-05-01T10:00:00-06:00",
      "lastServiceName": "Corte",
      "nextAppointmentAt": "2026-05-08T12:00:00-06:00"
    }
  ],
  "total": 1
}
```

### Notas

- `totalAppointments`: citas que no son `rejected_by_owner`, `owner_cancelled` ni `client_cancelled`.
- `lastAppointmentAt`: `requested_start_at` de la cita pasada mas reciente.
- `lastServiceName`: nombre del servicio de esa ultima cita.
- `nextAppointmentAt`: `requested_start_at` de la proxima cita futura mas cercana.
- Los campos de metricas pueden ser `null` si el cliente no tiene citas.

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

## GET /api/owner/clients/:id

Devuelve perfil completo de un cliente con estadisticas agregadas e historial de citas.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `booking.clients` |

### Body

No aplica.

### Success 200

```json
{
  "ok": true,
  "client": {
    "id": "client-uuid",
    "full_name": "[TEST] Usuario Prueba",
    "phone": "+526149999998",
    "created_at": "2026-04-26T19:20:00.000000-06:00",
    "last_seen_at": "2026-05-01T10:00:00-06:00",
    "totalAppointments": 12,
    "completedAppointments": 10,
    "cancelledAppointments": 1,
    "noShowAppointments": 1,
    "lastAppointmentAt": "2026-05-01T10:00:00-06:00",
    "nextAppointmentAt": "2026-05-08T12:00:00-06:00"
  },
  "appointments": [
    {
      "id": "appointment-uuid",
      "status": "confirmed_by_owner",
      "requested_start_at": "2026-05-08T18:00:00-06:00",
      "requested_end_at": "2026-05-08T18:35:00-06:00",
      "notes": null,
      "cancellation_reason": null,
      "created_at": "2026-04-26T19:20:00.000000-06:00",
      "services": {
        "id": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
        "name": "Corte",
        "duration_minutes": 30
      }
    }
  ]
}
```

### Notas

- `appointments` ordenado por `requested_start_at` descendente (mas reciente primero).
- `rejected_by_owner` se excluye de las estadisticas y del array `appointments`.
- `cancelledAppointments` incluye `client_cancelled` y `owner_cancelled`.

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es un UUID valido |
| `401` | Token owner faltante o incorrecto |
| `404` | Cliente no encontrado o inactivo |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/clients/<client-uuid>" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/services

Lista servicios. La respuesta incluye todos los campos de administracion.

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
      "name": "Corte",
      "description": "Servicio base para adulto",
      "duration_minutes": 30,
      "buffer_before_minutes": 0,
      "buffer_after_minutes": 5,
      "is_active": true,
      "sort_order": 1,
      "created_at": "2026-05-10T14:00:00.000Z",
      "updated_at": "2026-05-10T14:00:00.000Z"
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

## POST /api/owner/services

Crea un nuevo servicio. No puede haber dos servicios con el mismo `name`.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Body

```json
{
  "name": "Tinte",
  "description": "Coloracion completa",
  "durationMinutes": 60,
  "bufferBeforeMinutes": 0,
  "bufferAfterMinutes": 10,
  "sortOrder": 9,
  "isActive": true
}
```

### Validation

| Campo | Regla |
|---|---|
| `name` | string, trim, min 1, max 100, requerido |
| `description` | string, trim, max 500, nullable, opcional |
| `durationMinutes` | entero, min 5, max 480, requerido |
| `bufferBeforeMinutes` | entero, min 0, max 60, default `0` |
| `bufferAfterMinutes` | entero, min 0, max 60, default `5` |
| `sortOrder` | entero, min 0, max 999, default `0` |
| `isActive` | boolean, default `true` |

### Success 201

```json
{
  "ok": true,
  "service": {
    "id": "uuid",
    "name": "Tinte",
    "description": "Coloracion completa",
    "durationMinutes": 60,
    "bufferBeforeMinutes": 0,
    "bufferAfterMinutes": 10,
    "isActive": true,
    "sortOrder": 9,
    "createdAt": "2026-05-10T14:00:00.000Z",
    "updatedAt": "2026-05-10T14:00:00.000Z"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Body invalido o campo fuera de rango |
| `401` | Token owner faltante o incorrecto |
| `409` | Ya existe un servicio con ese `name` |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/owner/services \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tinte",
    "durationMinutes": 60,
    "sortOrder": 9
  }'
```

---

## PATCH /api/owner/services/:id

Actualiza uno o mas campos de un servicio. Todos los campos son opcionales;
debe enviarse al menos uno. Para desactivar un servicio usa `isActive: false`
(nunca se borra — preserva historial de citas).

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Path Params

| Param | Tipo | Notas |
|---|---|---|
| `id` | UUID | ID del servicio |

### Body

Todos los campos son opcionales. Ejemplos de casos de uso:

Cambiar nombre y duracion:
```json
{
  "name": "Corte Premium",
  "durationMinutes": 45
}
```

Desactivar servicio:
```json
{ "isActive": false }
```

Reordenar:
```json
{ "sortOrder": 3 }
```

Actualizar description:
```json
{ "description": "Nueva descripcion del servicio" }
```

### Validation

Mismas reglas que `POST /api/owner/services`, pero todos los campos son opcionales.
Minimo un campo requerido.

### Success 200

```json
{
  "ok": true,
  "service": {
    "id": "0f8057a3-f6ec-4c19-b065-6dbf27391cc5",
    "name": "Corte Premium",
    "description": "Servicio base para adulto",
    "durationMinutes": 45,
    "bufferBeforeMinutes": 0,
    "bufferAfterMinutes": 5,
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2026-05-10T14:00:00.000Z",
    "updatedAt": "2026-05-10T15:30:00.000Z"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID, body invalido, o ningun campo enviado |
| `401` | Token owner faltante o incorrecto |
| `404` | Servicio no encontrado |
| `409` | Ya existe otro servicio con ese `name` |
| `500` | Error interno |

### curl

```bash
# Desactivar un servicio
curl -X PATCH http://localhost:3000/api/owner/services/0f8057a3-f6ec-4c19-b065-6dbf27391cc5 \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
```

---

## GET /api/owner/settings

Devuelve la configuracion actual del negocio para la pantalla de ajustes.

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
  "settings": {
    "businessName": "Jaquelina Lopez Barber Studio",
    "slotDurationMinutes": 45,
    "bufferMinutes": 15,
    "maxAdvanceDays": 30,
    "timezone": "America/Mexico_City"
  }
}
```

### Notas

- Lee la fila existente de `booking.business_settings`.
- `slotDurationMinutes`, `bufferMinutes` y `maxAdvanceDays` viven como columnas nuevas en `booking.business_settings`.
- `slotDurationMinutes` es configuracion global para UI/settings. La duracion real de cada servicio sigue viniendo de `booking.services.duration_minutes`.
- Los buffers reales de agenda siguen siendo por servicio (`buffer_before_minutes`, `buffer_after_minutes`); `bufferMinutes` es un ajuste global persistido para la pantalla de settings.

### Expected Errors

| Status | Causa |
|---|---|
| `401` | Token owner faltante o incorrecto |
| `500` | No existe configuracion de negocio o error interno |

### curl

```bash
curl http://localhost:3000/api/owner/settings \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## PATCH /api/owner/settings

Actualiza uno o mas campos de configuracion del negocio.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Body

Todos los campos son opcionales, pero debe enviarse al menos uno.

```json
{
  "businessName": "Jaquelina Lopez Barber Studio",
  "slotDurationMinutes": 45,
  "bufferMinutes": 15,
  "maxAdvanceDays": 30,
  "timezone": "America/Mexico_City"
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `businessName` | string | min 2, max 100 |
| `slotDurationMinutes` | number | entero, min 15, max 240 |
| `bufferMinutes` | number | entero, min 0, max 120 |
| `maxAdvanceDays` | number | entero, min 1, max 365 |
| `timezone` | string | timezone IANA valido |

### Success 200

```json
{
  "ok": true,
  "settings": {
    "businessName": "Jaquelina Lopez Barber Studio",
    "slotDurationMinutes": 45,
    "bufferMinutes": 15,
    "maxAdvanceDays": 30,
    "timezone": "America/Mexico_City"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Body invalido, rango fuera de limites, timezone invalido, o body vacio |
| `401` | Token owner faltante o incorrecto |
| `404` | Configuracion no encontrada durante update |
| `500` | Error interno |

### curl

```bash
curl -X PATCH http://localhost:3000/api/owner/settings \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{"maxAdvanceDays":45}'
```

---

## GET /api/owner/messages

Historial y auditoria de mensajes/notificaciones enviados a clientes por WhatsApp. Lee la tabla `outbound_messages`.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Query Params

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `status` | string | none | `pending` \| `queued` \| `sent` \| `delivered` \| `read` \| `failed` |
| `messageType` | string | none | `confirmation` \| `reminder` \| `reconfirmation` \| `cancellation` \| `reschedule` \| `incident` \| `owner_approval_result` \| `general` |
| `clientId` | UUID | none | Filtra por cliente |
| `startDate` | `YYYY-MM-DD` | none | Requiere `endDate`. Filtra por `created_at` |
| `endDate` | `YYYY-MM-DD` | none | Requiere `startDate`. Maximo 45 dias de rango |
| `page` | number | `1` | Minimo 1 |
| `limit` | number | `20` | Maximo 100 |

### Body

No aplica.

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "c058f22f-e3b5-4409-8d4e-7ed04e45f4b1",
      "channel": "whatsapp",
      "messageType": "confirmation",
      "status": "pending",
      "client": {
        "id": "488af9e7-4d36-4467-8080-67fcc3b6ff09",
        "fullName": "Cliente Prueba",
        "phone": "+526149999998"
      },
      "appointment": {
        "id": "280e87d3-8723-4ece-a9a6-bad643f297b3",
        "requestedStartAt": "2026-06-15T10:55:00-06:00",
        "serviceName": "Corte"
      },
      "body": "Hola Cliente Prueba, recibimos tu solicitud de cita para Corte. La revisaremos y te confirmaremos pronto.",
      "sentAt": null,
      "deliveredAt": null,
      "failedAt": null,
      "failureReason": null,
      "createdAt": "2026-05-01T21:52:26.615924-06:00"
    }
  ],
  "total": 1,
  "summary": {
    "total": 1,
    "pending": 1,
    "queued": 0,
    "sent": 0,
    "delivered": 0,
    "read": 0,
    "failed": 0
  }
}
```

### Notas

- Lista ordenada por `createdAt` descendente (mas reciente primero).
- `appointment` puede ser `null` si el mensaje no esta ligado a una cita.
- Sin integracion WhatsApp real, todos los mensajes tendran `status: pending`. Los campos `sentAt`, `deliveredAt`, `failedAt`, `failureReason` seran `null`.
- Los mensajes se generan automaticamente al ejecutar acciones de citas: solicitud, aprobacion, rechazo, cancelacion, reprogramacion.
- Esta ruta lee `booking.outbound_messages`, que es la cola futura de envio WhatsApp.
- No lee `booking.notification_events`; esa tabla queda como auditoria/eventos internos.
- Solo hay datos desde el deploy de esta feature (2026-05-01). Citas historicas no tienen registros.

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Query params invalidos (enum incorrecto, UUID invalido, rango de fechas) |
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/messages?status=pending&page=1&limit=20" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/inbound-messages

Lista mensajes recibidos desde WhatsApp del cliente hacia el negocio. Lee la tabla `booking.inbound_messages` y traduce `parsed_intent` a `intent` para el frontend.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Query Params

Todos son opcionales.

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `intent` | inbound intent enum | none | Filtra por un intent especifico. |
| `needs_human_review` | `true` / `false` | none | Filtra mensajes que requieren atencion humana. |
| `read` | `true` / `false` | none | `false` devuelve no leidos (`readAt = null`). |
| `page` | number | `1` | Minimo 1. |
| `limit` | number | `20` | Minimo 1, maximo 100. |

Valores validos de `intent`:

```text
booking, availability, confirm, cancel, reschedule, late, location, price, hours, human_help, greeting, thanks, unknown
```

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "inbound-message-uuid",
      "channel": "whatsapp",
      "fromPhone": "+526141234567",
      "body": "Hola, quiero agendar una cita",
      "intent": "booking",
      "confidence": 0.9,
      "needs_human_review": false,
      "normalized_body": "hola quiero agendar una cita",
      "botReplied": true,
      "botRepliedAt": "2026-05-09T18:00:02.000Z",
      "outboundMessageId": "outbound-message-uuid",
      "client": {
        "id": "client-uuid",
        "fullName": "Cliente Prueba",
        "phone": "+526141234567"
      },
      "appointment": null,
      "receivedAt": "2026-05-09T18:00:00.000Z",
      "readAt": null
    }
  ],
  "total": 1,
  "summary": {
    "total": 1,
    "needsHumanReview": 0,
    "unread": 1,
    "byIntent": {
      "booking": 1,
      "availability": 0,
      "confirm": 0,
      "cancel": 0,
      "reschedule": 0,
      "late": 0,
      "location": 0,
      "price": 0,
      "hours": 0,
      "human_help": 0,
      "greeting": 0,
      "thanks": 0,
      "unknown": 0
    }
  }
}
```

### Field Notes

- `client` puede ser `null` si el telefono no existe en `booking.clients`.
- `appointment` puede ser `null` si el mensaje aun no esta vinculado a una cita.
- `fromPhone` se incluye para que el owner pueda contactar al cliente aunque `client` sea `null`.
- `receivedAt` viene de `inbound_messages.received_at`.
- `readAt` viene de `inbound_messages.read_at`; `null` significa no leido.
- `botReplied` es boolean y se deriva de `bot_replied_at IS NOT NULL`.
- `botRepliedAt` viene de `inbound_messages.bot_replied_at`.
- `outboundMessageId` apunta al `outbound_messages.id` de la respuesta automatica, si existe.
- `needs_human_review` debe interpretarse como atencion humana pendiente. Si `botReplied=true`, el valor sera `false`.
- `greeting`, `thanks`, `hours`, `location` y `price` no requieren atencion humana aunque no esten vinculados a cita.
- `human_help` urgente y `unknown` sin respuesta automatica requieren atencion humana.
- Para UI: `botReplied=true` puede mostrarse como banner verde. `botReplied=false && needs_human_review=true` puede mostrarse como banner rojo.

### TypeScript Reference

```ts
type InboundMessageIntent =
  | 'booking'
  | 'availability'
  | 'confirm'
  | 'cancel'
  | 'reschedule'
  | 'late'
  | 'location'
  | 'price'
  | 'hours'
  | 'human_help'
  | 'greeting'
  | 'thanks'
  | 'unknown'

type OwnerInboundMessage = {
  id: string
  channel: string
  fromPhone: string
  body: string
  intent: InboundMessageIntent
  confidence: number
  needs_human_review: boolean
  normalized_body: string | null
  botReplied: boolean
  botRepliedAt: string | null
  outboundMessageId: string | null
  client: {
    id: string
    fullName: string
    phone: string
  } | null
  appointment: {
    id: string
    requestedStartAt: string
    serviceName: string | null
  } | null
  receivedAt: string
  readAt: string | null
}

type OwnerInboundMessagesResponse = {
  ok: true
  data: OwnerInboundMessage[]
  total: number
  summary: {
    total: number
    needsHumanReview: number
    unread: number
    byIntent: Record<InboundMessageIntent, number>
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Query params invalidos (`intent`, booleanos, `page`, `limit`) |
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/inbound-messages?needs_human_review=true&page=1&limit=20" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## PATCH /api/owner/inbound-messages/:id/read

Marca un mensaje inbound como leido por el owner. Actualiza `booking.inbound_messages.read_at = now()`.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `booking.inbound_messages` |

### Body

No requerido.

```json
{}
```

### Success 200

```json
{
  "ok": true,
  "message": {
    "id": "inbound-message-uuid",
    "readAt": "2026-05-09T18:05:00.000Z"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID valido |
| `401` | Token owner faltante o incorrecto |
| `404` | Mensaje inbound no encontrado |
| `500` | Error interno |

### curl

```bash
curl -X PATCH "http://localhost:3000/api/owner/inbound-messages/<inbound-message-uuid>/read" \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## POST /api/owner/inbound-messages/:id/link-appointment

Vincula manualmente un mensaje inbound con una cita existente.

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
| `id` | UUID de `booking.inbound_messages` |

### Body

```json
{
  "appointmentId": "appointment-uuid"
}
```

### Success 200

```json
{
  "ok": true,
  "message": {
    "id": "inbound-message-uuid",
    "appointmentId": "appointment-uuid"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` o `appointmentId` no son UUID validos |
| `401` | Token owner faltante o incorrecto |
| `404` | Mensaje inbound o cita no encontrada |
| `500` | Error interno |

### curl

```bash
curl -X POST "http://localhost:3000/api/owner/inbound-messages/<inbound-message-uuid>/link-appointment" \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"<appointment-uuid>"}'
```

---

## POST /api/owner/messages/:id/retry

Reintenta el envio de un mensaje que fallo. Cambia el estado de `failed` a `queued`.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Path Params

| Param | Tipo |
|---|---|
| `id` | UUID de `outbound_messages` |

### Body

```json
{}
```

### Success 200

```json
{
  "ok": true,
  "message": {
    "id": "c058f22f-e3b5-4409-8d4e-7ed04e45f4b1",
    "status": "queued"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es un UUID valido |
| `401` | Token owner faltante o incorrecto |
| `404` | Mensaje no encontrado |
| `422` | El mensaje no esta en estado `failed` (incluye estado actual en el mensaje de error) |
| `500` | Error interno |

### curl

```bash
curl -X POST "http://localhost:3000/api/owner/messages/<message-uuid>/retry" \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## GET /api/owner/time-blocks

Lista bloqueos activos que afectan un rango de fechas.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Query Params

| Param | Tipo | Requerido | Notas |
|---|---|---|---|
| `startDate` | `YYYY-MM-DD` | Si | Fecha local inicial |
| `endDate` | `YYYY-MM-DD` | Si | Fecha local final |

Reglas:

- Fechas reales.
- `startDate <= endDate`.
- Rango maximo: 45 dias.

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "time-block-uuid",
      "block_type": "personal",
      "reason": "Descanso",
      "is_recurring": true,
      "day_of_week": 1,
      "specific_date": null,
      "start_time": "13:00:00",
      "end_time": "14:00:00"
    }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Query invalido, fecha inexistente, rango invalido |
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl "http://localhost:3000/api/owner/time-blocks?startDate=2026-06-01&endDate=2026-06-07" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## POST /api/owner/time-blocks

Crea un bloqueo activo de agenda.

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
Content-Type: application/json
```

### Body bloqueo especifico

```json
{
  "blockType": "personal",
  "reason": "Comida",
  "isRecurring": false,
  "specificDate": "2026-06-04",
  "dayOfWeek": null,
  "startTime": "13:00",
  "endTime": "14:00"
}
```

### Body bloqueo recurrente

```json
{
  "blockType": "comida",
  "reason": "Comida",
  "isRecurring": true,
  "specificDate": null,
  "dayOfWeek": 1,
  "startTime": "13:00",
  "endTime": "14:00"
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `blockType` | string | Si | Acepta canonicos `lunch`, `personal`, `school`, `break`, `errand`, `manual`, `other` y alias `comida`, `descanso`, `mandado`, `otro`, `escuela`. |
| `reason` | string/null | No | Maximo 100 caracteres. |
| `isRecurring` | boolean | Si | `false` = fecha especifica, `true` = semanal recurrente. |
| `specificDate` | `YYYY-MM-DD`/null | Condicional | Requerido cuando `isRecurring=false`. |
| `dayOfWeek` | integer/null | Condicional | Requerido cuando `isRecurring=true`; `0` domingo ... `6` sabado. |
| `startTime` | `HH:mm` | Si | Minutos permitidos: `00`, `15`, `30`, `45`. |
| `endTime` | `HH:mm` | Si | Debe ser mayor que `startTime`. |

### Success 200

```json
{
  "ok": true,
  "timeBlock": {
    "id": "time-block-uuid",
    "block_type": "lunch",
    "reason": "Comida",
    "is_recurring": false,
    "day_of_week": null,
    "specific_date": "2026-06-04",
    "start_time": "13:00:00",
    "end_time": "14:00:00"
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Body invalido |
| `401` | Token owner faltante o incorrecto |
| `409` | Bloqueo solapa con otro bloqueo activo o con una cita activa |
| `500` | Error interno |

### curl

```bash
curl -X POST http://localhost:3000/api/owner/time-blocks \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "blockType": "comida",
    "reason": "Comida",
    "isRecurring": false,
    "specificDate": "2026-06-04",
    "dayOfWeek": null,
    "startTime": "13:00",
    "endTime": "14:00"
  }'
```

---

## DELETE /api/owner/time-blocks/:id

Desactiva un bloqueo existente con soft delete (`is_active=false`).

### Auth

Owner bearer token requerido.

### Headers

```http
Authorization: Bearer <OWNER_SECRET>
```

### Params

| Param | Tipo | Requerido |
|---|---|---|
| `id` | UUID | Si |

### Success 200

```json
{
  "ok": true,
  "timeBlock": {
    "id": "time-block-uuid",
    "is_active": false
  }
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `id` no es UUID valido |
| `401` | Token owner faltante o incorrecto |
| `404` | Bloqueo no encontrado o ya desactivado |
| `500` | Error interno |

### curl

```bash
curl -X DELETE http://localhost:3000/api/owner/time-blocks/time-block-uuid \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## GET /api/owner/weekly-availability

Devuelve la disponibilidad semanal del negocio.

### Auth

Owner bearer token requerido.

### Query Params

| Param | Tipo | Requerido | Notas |
|---|---|---|---|
| `week_start_date` | string | No | Lunes de la semana en formato `YYYY-MM-DD`. |

### Success 200 sin `week_start_date`

```json
{
  "ok": true,
  "availability": [
    {
      "id": "uuid-lunes",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "20:00",
      "isActive": true,
      "isOverride": false,
      "overrideId": null
    }
  ]
}
```

### Success 200 con `week_start_date`

```json
{
  "ok": true,
  "week_start_date": "2026-05-11",
  "hasOverrides": true,
  "availability": [
    {
      "id": "uuid-template-lunes",
      "dayOfWeek": 1,
      "startTime": "14:00",
      "endTime": "18:00",
      "isActive": true,
      "isOverride": true,
      "overrideId": "uuid-override-lunes"
    }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | `week_start_date` invalido o no es lunes |
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

### curl

```bash
curl http://localhost:3000/api/owner/weekly-availability \
  -H "Authorization: Bearer dev-owner-secret"

curl "http://localhost:3000/api/owner/weekly-availability?week_start_date=2026-05-11" \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## PUT /api/owner/weekly-availability

Actualiza disponibilidad semanal. Sin `week_start_date` actualiza el template base; con `week_start_date` crea/actualiza overrides para esa semana.

### Auth

Owner bearer token requerido.

### Body

```json
{
  "availability": [
    { "dayOfWeek": 1, "startTime": "14:00", "endTime": "18:00", "isActive": true },
    { "dayOfWeek": 2, "startTime": "09:00", "endTime": "20:00", "isActive": true }
  ]
}
```

### Expected Errors

| Status | Causa |
|---|---|
| `400` | Body invalido, minutos no permitidos, duplicados, `week_start_date` no lunes |
| `401` | Token owner faltante o incorrecto |
| `500` | Error interno |

---

## DELETE /api/owner/weekly-availability

Elimina overrides de una semana especifica.

### Auth

Owner bearer token requerido.

### Query Params

| Param | Tipo | Requerido | Notas |
|---|---|---|---|
| `week_start_date` | string | Si | Lunes de la semana. |
| `day_of_week` | integer | No | Si se omite, borra todos los overrides de la semana. |

### Success 200

```json
{
  "ok": true,
  "deletedCount": 2
}
```

---

## GET /api/owner/incidents

Lista incidencias.

### Auth

Owner bearer token requerido.

### Query Params

| Param | Tipo | Requerido |
|---|---|---|
| `status` | `active` / `resolved` / `cancelled` | No |
| `startDate` | `YYYY-MM-DD` | No |
| `endDate` | `YYYY-MM-DD` | No |

### Success 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "incident-uuid",
      "title": "Emergencia",
      "description": "Cierre temporal",
      "status": "active",
      "time_range": "[\"2026-06-04 09:00:00-06\",\"2026-06-04 12:00:00-06\")",
      "resolved_at": null
    }
  ]
}
```

---

## POST /api/owner/incidents

Crea una incidencia operativa real para el dia actual del negocio.

### Auth

Owner bearer token requerido.

### Body

```json
{
  "severity": "high",
  "reasons": ["Emergencia personal", "Cierre temporal"],
  "description": "La owner no podra atender durante el dia.",
  "cancelAppointments": true,
  "notifyClients": true
}
```

### Success 200

```json
{
  "ok": true,
  "incident": {
    "id": "incident-uuid",
    "severity": "high",
    "description": "La owner no podra atender durante el dia.",
    "created_at": "2026-05-09T18:30:00.000Z",
    "affectedAppointmentsCount": 3
  }
}
```

---

## POST /api/owner/appointments/:id/approve

Aprueba una cita pendiente.

### Auth

Owner bearer token requerido.

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

### Body

```json
{ "reason": "[TEST] Rechazo manual" }
```

`reason` es opcional.

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

### Body

```json
{ "reason": "[TEST] Cancelacion manual" }
```

`reason` es opcional.

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

### curl

```bash
curl -X POST http://localhost:3000/api/owner/appointments/<appointment-id>/complete \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## POST /api/owner/appointments/:id/reschedule

Reprograma una cita desde el panel owner.

### Body

```json
{
  "newStartAt": "2026-06-10T10:00:00-06:00",
  "reason": "Reagendo por incidencia",
  "notifyClient": true
}
```

Todos los campos son opcionales. Si `newStartAt` se omite, la cita queda en `reschedule_required`.

### curl

```bash
curl -X POST http://localhost:3000/api/owner/appointments/<appointment-id>/reschedule \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "newStartAt": "2026-06-10T10:00:00-06:00",
    "reason": "Reagendo por incidencia",
    "notifyClient": true
  }'
```

---

## GET /api/owner/messages/diagnostics

Devuelve estado actual de la integracion WhatsApp y cola de mensajes. No expone secretos.

### Auth

Owner bearer token requerido.

### Success 200

```json
{
  "ok": true,
  "whatsapp": {
    "dryRun": false,
    "mode": "test",
    "workerEnabled": true,
    "workerIntervalMs": 30000,
    "workerBatchSize": 20,
    "phoneNumberIdConfigured": true,
    "accessTokenConfigured": true,
    "verifyTokenConfigured": true,
    "allowedTestPhonesCount": 1,
    "miniAppBaseUrl": "https://barberjaquelinalopezstudio.netlify.app/miniapp",
    "emergencyCallPhoneConfigured": false
  },
  "queue": {
    "pending": 2,
    "queued": 0,
    "sent": 0,
    "delivered": 0,
    "read": 0,
    "failed": 0
  }
}
```

### curl

```bash
curl http://localhost:3000/api/owner/messages/diagnostics \
  -H "Authorization: Bearer dev-owner-secret"
```

---

## POST /api/owner/messages/:id/send-now

Intenta enviar inmediatamente un mensaje `pending`, `queued` o `failed`.

### Auth

Owner bearer token requerido.

### Success 200

```json
{
  "ok": true,
  "message": {
    "id": "uuid",
    "status": "sent",
    "providerMessageId": "wamid..."
  }
}
```

### curl

```bash
curl -X POST "http://localhost:3000/api/owner/messages/<message-uuid>/send-now" \
  -H "Authorization: Bearer dev-owner-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

# MVP Flow

## 1. Cliente solicita cita

```http
POST /api/public-booking/request
```

## 2. Owner ve pendientes

```http
GET /api/owner/appointments/pending
```

## 3. Owner aprueba o rechaza

```http
POST /api/owner/appointments/:id/approve
POST /api/owner/appointments/:id/reject
```

## 4. Owner cancela

```http
POST /api/owner/appointments/:id/cancel
```

Estados origen: `pending_owner_approval`, `confirmed_by_owner`.

## 5. Owner completa

```http
POST /api/owner/appointments/:id/complete
```

## 6. Owner reprograma

```http
POST /api/owner/appointments/:id/reschedule
```

Con `newStartAt` ? `awaiting_client_confirmation`. Sin `newStartAt` ? `reschedule_required`.

---

# Frontend Integration Notes

## Base URL

```ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
```

## Error handling recomendado

```ts
if (!response.ok) {
  switch (response.status) {
    case 400: /* errores de formulario */ break
    case 401: /* owner no autorizado */ break
    case 404: /* recurso no encontrado */ break
    case 409: /* slot ocupado */ break
    case 422: /* regla de negocio */ break
    case 429: /* rate limit */ break
    default:  /* 500 u otros */ break
  }
}
```

## Slot display

Mostrar al cliente el `startAt` visible. No mostrar `requestedStartAt` si incluye buffer previo.

---

# Mini App WhatsApp Integration

## Menu WhatsApp

```
1. Agendar cita
2. Ver horarios disponibles
3. Reprogramar
4. Cancelar
5. Cita de emergencia / llamada directa
```

| Opcion | Intent |
|---|---|
| `1` | `booking` |
| `2` | `availability` |
| `3` | `reschedule` |
| `4` | `cancel` |
| `5` | `human_help` con `metadata.action=emergency_call` |

## GET /api/public/miniapp-tokens/:token

Publico. Valida token y devuelve datos del cliente y cita.

```json
{
  "ok": true,
  "purpose": "reschedule",
  "phone": "+5216143278357",
  "fullName": "Nombre Cliente",
  "expiresAt": "2026-05-10T20:00:00.000Z",
  "appointment": {
    "id": "uuid",
    "serviceId": "uuid",
    "serviceName": "Corte",
    "startAt": "2026-05-11T16:00:00.000Z",
    "status": "confirmed_by_owner"
  },
  "appointments": []
}
```

## POST /api/public/appointments/reschedule-request

Publico. Token requerido en body con `purpose=reschedule`.

```json
{
  "token": "token-seguro",
  "appointmentId": "uuid",
  "newStartAt": "2026-05-11T10:00:00-06:00",
  "notes": "Prefiero por la manana"
}
```

## POST /api/public/appointments/cancel

Publico. Token requerido en body con `purpose=cancel`.

```json
{
  "token": "token-seguro",
  "appointmentId": "uuid",
  "reason": "Se me complico asistir"
}
```

---

# WhatsApp Webhook Endpoints

## GET /api/whatsapp/webhook

Verificacion Meta (handshake). Responde con `hub.challenge` en texto plano.

## POST /api/whatsapp/webhook

Recibe mensajes y statuses de Meta. Siempre responde `200` rapido.

---

# Estado actual Railway — Mayo 2026

| Variable | Valor activo | Notas |
|---|---|---|
| `NODE_ENV` | `production` | Validaciones estrictas activas |
| `WHATSAPP_MODE` | `test` | Solo envia a `WHATSAPP_ALLOWED_TEST_PHONES` |
| `WHATSAPP_DRY_RUN` | `false` | Llama a Cloud API real |
| `WHATSAPP_ALLOWED_TEST_PHONES` | `+5216143278357` | Unico telefono autorizado |
| `WHATSAPP_WORKER_ENABLED` | `true` | Worker activo, cada 30s |
| `WHATSAPP_API_VERSION` | `v25.0` | Version actual Graph API |
| `BUSINESS_ADDRESS` | no configurado | Pendiente alta del negocio |
| `EMERGENCY_CALL_PHONE` | no configurado | Pendiente numero oficial |

## Cambios para produccion real

1. `WHATSAPP_MODE` ? `production`
2. Agregar `BUSINESS_ADDRESS`
3. Agregar `EMERGENCY_CALL_PHONE`
4. Implementar verificacion `X-Hub-Signature-256`

---

# Endpoint Summary

| Metodo | Ruta | Auth |
|---|---|---|
| `GET` | `/health` | No |
| `POST` | `/api/public-booking/request` | No |
| `GET` | `/api/public/services` | No |
| `GET` | `/api/public/availability` | No |
| `GET` | `/api/public/miniapp-tokens/:token` | No |
| `POST` | `/api/public/appointments/reschedule-request` | No |
| `POST` | `/api/public/appointments/cancel` | No |
| `GET` | `/api/whatsapp/webhook` | No (Meta verification) |
| `POST` | `/api/whatsapp/webhook` | No (Meta inbound) |
| `GET` | `/api/owner/appointments/pending` | Owner bearer |
| `GET` | `/api/owner/appointments/awaiting` | Owner bearer |
| `GET` | `/api/owner/appointments` | Owner bearer |
| `GET` | `/api/owner/appointments/today` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/approve` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/reject` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/cancel` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/complete` | Owner bearer |
| `POST` | `/api/owner/appointments/:id/reschedule` | Owner bearer |
| `GET` | `/api/owner/clients` | Owner bearer |
| `GET` | `/api/owner/clients/:id` | Owner bearer |
| `GET` | `/api/owner/services` | Owner bearer |
| `POST` | `/api/owner/services` | Owner bearer |
| `PATCH` | `/api/owner/services/:id` | Owner bearer |
| `GET` | `/api/owner/settings` | Owner bearer |
| `PATCH` | `/api/owner/settings` | Owner bearer |
| `GET` | `/api/owner/messages` | Owner bearer |
| `POST` | `/api/owner/messages/:id/retry` | Owner bearer |
| `POST` | `/api/owner/messages/:id/send-now` | Owner bearer |
| `GET` | `/api/owner/messages/diagnostics` | Owner bearer |
| `GET` | `/api/owner/inbound-messages` | Owner bearer |
| `PATCH` | `/api/owner/inbound-messages/:id/read` | Owner bearer |
| `POST` | `/api/owner/inbound-messages/:id/link-appointment` | Owner bearer |
| `GET` | `/api/owner/time-blocks` | Owner bearer |
| `POST` | `/api/owner/time-blocks` | Owner bearer |
| `DELETE` | `/api/owner/time-blocks/:id` | Owner bearer |
| `GET` | `/api/owner/incidents` | Owner bearer |
| `POST` | `/api/owner/incidents` | Owner bearer |
| `GET` | `/api/owner/weekly-availability` | Owner bearer |
| `PUT` | `/api/owner/weekly-availability` | Owner bearer |
| `DELETE` | `/api/owner/weekly-availability` | Owner bearer |
