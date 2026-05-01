# API: public-booking-request

Endpoint para solicitar una cita desde la mini app **sin login tradicional**.

---

## Resumen

| Campo | Valor |
|---|---|
| **URL** | `POST /functions/v1/public-booking-request` |
| **Auth** | No requerida (pública) |
| **Content-Type** | `application/json` |
| **Función** | `supabase/functions/public-booking-request/index.ts` |
| **Runtime** | Deno (Supabase Edge Functions) |

---

## Request

### Headers

```http
Content-Type: application/json
```

### Body

```jsonc
{
  "fullName": "Juan Pérez",         // string, min 2, max 100 — requerido
  "phone": "+526141234567",          // string — requerido (se normaliza y valida con regex)
  "serviceId": "uuid-del-servicio",  // UUID v4 — requerido
  "startAt": "2026-05-01T16:00:00.000Z", // ISO 8601 con timezone — requerido
  "notes": "Quisiera fade alto",     // string, max 500 — opcional
  "token": "abc123..."               // string — opcional (Fase 3: mini app tokens)
}
```

### Validaciones de `startAt`

- Debe ser un string ISO 8601 válido con timezone offset (`Z` o `+HH:MM`).
- Debe ser una fecha futura con al menos **30 minutos** de anticipación respecto al momento de la solicitud.

### Validaciones de `phone`

- Se normaliza automáticamente: se eliminan espacios, guiones, paréntesis y puntos.
- Se valida con regex `/^\+?[1-9]\d{7,14}$/` sobre el valor ya normalizado.
- Soporta formatos internacionales (`+52`, `+1`, etc.).
- El valor normalizado es el que se almacena en la BD y el que se usa para buscar clientes existentes.
- Recomendado: enviar con prefijo de país (ej: `+526141234567`).

---

## Responses

### 200 — Éxito

```json
{
  "ok": true,
  "appointment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending_owner_approval",
    "requestedStartAt": "2026-05-01T15:55:00.000Z",
    "requestedEndAt": "2026-05-01T16:35:00.000Z"
  },
  "client": {
    "fullName": "Juan Pérez",
    "phone": "+526141234567"
  }
}
```

> **Nota:** `requestedStartAt` y `requestedEndAt` incluyen los buffers del servicio (`buffer_before_minutes` y `buffer_after_minutes`). El cliente ve el slot visible (`startAt` del request), no el rango con buffers.

### 400 — Error de validación (Zod)

```json
{
  "ok": false,
  "error": "Error de validación",
  "details": {
    "serviceId": ["serviceId debe ser un UUID válido"],
    "startAt": ["startAt debe ser una fecha ISO 8601 válida"]
  }
}
```

### 404 — Servicio no encontrado

```json
{
  "ok": false,
  "error": "Servicio no encontrado o inactivo"
}
```

### 405 — Método no permitido

```json
{
  "ok": false,
  "error": "Método no permitido"
}
```

### 409 — Horario no disponible

```json
{
  "ok": false,
  "error": "El horario seleccionado no está disponible. Por favor elige otro."
}
```

Se devuelve 409 en tres capas de protección:

- **Capa 1**: RPC `is_slot_available()` devuelve `false` antes del INSERT.
- **Capa 2**: Trigger `trg_02_validate_appointment_slot` lanza `RAISE EXCEPTION` (código PostgreSQL `P0001`).
- **Capa 3**: EXCLUDE constraint `appointments_no_overlap_active_excl` detecta solapamiento en el motor (código PostgreSQL `23P01`).

### 422 — Error de negocio

```json
{
  "ok": false,
  "error": "La cita debe solicitarse con al menos 30 minutos de anticipación"
}
```

### 500 — Error interno

```json
{
  "ok": false,
  "error": "Error interno del servidor"
}
```

---

## Lógica de negocio

### Flujo completo

```
POST body recibido
    │
    ▼
Validación Zod (400 si falla)
    │
    ▼
¿startAt > now + 30min? (422 si no)
    │
    ▼
Buscar servicio por serviceId WHERE is_active = true (404 si no existe)
    │
    ▼
Calcular rango con buffers:
  requestedStartAt = startAt - buffer_before_minutes
  requestedEndAt   = startAt + duration_minutes + buffer_after_minutes
    │
    ▼
RPC is_slot_available(requestedStartAt, requestedEndAt) (409 si false)
    │
    ▼
¿Existe cliente con ese phone?
  ├── SÍ → actualizar full_name y last_seen_at
  └── NO → crear cliente (profile_id = null)
    │
    ▼
INSERT appointment (status = 'pending_owner_approval')
  → Trigger trg_01_set_appointment_time_range setea time_range
  → Trigger trg_02_validate_appointment_slot re-valida (segunda capa)
  → Trigger log_appointment_status registra en appointment_status_history
    │
    ▼
INSERT notification_event (event_type = 'appointment_requested')
  [si falla, solo se loggea — no revierte la cita]
    │
    ▼
200 { ok: true, appointment, client }
```

### Cálculo de buffers

El campo `startAt` del request corresponde al **slot visible** para el cliente (lo que devuelve `get_available_slots`).  
La función aplica los buffers del servicio para calcular el rango real que bloquea en la agenda:

```
startAt visible:        16:00
buffer_before:          0 min
buffer_after:           5 min
duration:               30 min

requestedStartAt:       16:00 (16:00 - 0min)
requestedEndAt:         16:35 (16:00 + 30min + 5min)
```

### Cliente existente vs. nuevo

| Caso | Acción |
|---|---|
| `phone` ya existe en `booking.clients` | Reutiliza el cliente; actualiza `full_name` y `last_seen_at` |
| `phone` no existe | Crea nuevo cliente con `profile_id = null` (cliente sin cuenta de Auth) |
| Race condition (doble submit con mismo phone) | Re-consulta el cliente creado por el request concurrente y continúa el flujo |

---

## Tablas y funciones afectadas

| Recurso | Acción | Motivo |
|---|---|---|
| `booking.services` | SELECT | Verificar existencia y obtener duración/buffers |
| `booking.clients` | SELECT + INSERT/UPDATE | Buscar o crear cliente |
| `booking.appointments` | INSERT | Crear la cita |
| `booking.appointment_status_history` | INSERT (trigger) | Auditoría automática del estado inicial |
| `booking.notification_events` | INSERT | Cola de notificación para el owner |
| `booking.is_slot_available()` | RPC | Verificar disponibilidad del horario |

---

## Seguridad

- Usa `SUPABASE_SERVICE_ROLE_KEY` solo dentro de la Edge Function (server-side). Nunca exponer al cliente.
- CORS configurado con `Access-Control-Allow-Origin: *` — restringir al dominio de la mini app en producción.
- No se exponen errores internos de PostgreSQL al cliente.
- El campo `token` se recibe pero no se valida en esta versión. Fase 3 implementará la validación de `booking.mini_app_tokens`.
- Validación de input con Zod previene inyección y tipos incorrectos.
- La BD tiene una segunda capa de validación vía trigger (`trg_02_validate_appointment_slot`).

---

## Variables de entorno requeridas

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Project Settings → API → service_role |

En producción, estas variables son inyectadas automáticamente por la plataforma Supabase.  
En desarrollo local, crea `supabase/functions/.env`:

```env
SUPABASE_URL=https://hfmjmzyqzvrwmkvxwpia.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

---

## Deploy

```powershell
# Desde la raíz del repo
supabase functions deploy public-booking-request

# Con variables de entorno (si no están configuradas en el dashboard)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<valor>
```

## Prueba rápida (curl)

```bash
curl -X POST https://hfmjmzyqzvrwmkvxwpia.supabase.co/functions/v1/public-booking-request \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Juan Pérez",
    "phone": "+526141234567",
    "serviceId": "<uuid-de-un-servicio-activo>",
    "startAt": "2026-05-05T16:00:00.000Z",
    "notes": "Fade bajo"
  }'
```

## Prueba local (Supabase CLI)

```powershell
# Requiere Docker instalado
supabase functions serve public-booking-request --env-file supabase/functions/.env

# En otra terminal:
curl -X POST http://localhost:54321/functions/v1/public-booking-request `
  -H "Content-Type: application/json" `
  -d '{"fullName":"Test","phone":"+521234567890","serviceId":"<uuid>","startAt":"2026-05-05T16:00:00.000Z"}'
```

---

## Deuda técnica — pendientes antes de producción

| Item | Detalle | Prioridad |
|---|---|---|
| **Rate limiting** | Sin límite de requests por IP o phone. Un actor puede enviar N solicitudes. | Alta |
| **Validación de `token`** | El campo se recibe pero no se valida en esta versión. Implementar en Fase 3. | Media |
| **CORS origin** | `Access-Control-Allow-Origin: *`. Restringir al dominio de la mini app antes de producción. | Alta |
| **EXCLUDE constraint** | La migración `20260426220000_add_appointments_no_overlap_constraint.sql` debe aplicarse con `supabase db push` antes del deploy de la función. | Alta |

---

## Evolución futura

| Fase | Cambio |
|---|---|
| Fase 3 | Validar el campo `token` contra `booking.mini_app_tokens` |
| Fase 4 | Enviar mensaje WhatsApp de confirmación de solicitud al cliente |
| Fase 5 | Disparar recordatorio programado en `notification_events.scheduled_for` |

---

_Última revisión: 2026-04-26_
