# Frontend Integration Contract — Jaquelina López Barber Studio

Define exactamente qué debe llamar el frontend (React Native + Expo) para cada acción del sistema.  
Todas las llamadas usan el **Supabase JavaScript SDK** (`@supabase/supabase-js`).

---

## Inicialización del cliente Supabase

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!   // NUNCA uses la service_role key en el frontend
)
```

> La `anon key` es pública y segura de incluir en el cliente.  
> El `service_role key` **nunca** debe ir en el frontend — solo en Edge Functions o backends seguros.

---

## Roles y autenticación

| Rol | Descripción | Cómo se autentica |
|---|---|---|
| `owner` | Jaquelina (dueña del estudio) | Email/Password via Supabase Auth |
| `client` | Cualquier cliente del estudio | Email/Password o token de mini app |

RLS garantiza que cada usuario solo vea y modifique lo que le corresponde.

---

## Convenciones de este documento

- **Tipo Direct query**: SELECT directo a una tabla (controlado por RLS)
- **Tipo RPC**: llama a una función PostgreSQL via `supabase.rpc()`
- `→` indica el tipo de retorno
- `[owner]` / `[client]` / `[owner, client]` indica quién puede ejecutar la acción
- Los parámetros marcados con `?` son opcionales

---

## 1. Obtener servicios disponibles

| Campo | Valor |
|---|---|
| **Tipo** | Direct query |
| **Tabla** | `booking.services` |
| **Rol permitido** | `owner`, `client` |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .from('services')
  .select('id, name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, sort_order')
  .eq('is_active', true)
  .order('sort_order', { ascending: true })
```

**Respuesta esperada:**

```typescript
type Service = {
  id: string                    // uuid
  name: string                  // "Corte de cabello"
  description: string | null
  duration_minutes: number      // 30
  buffer_before_minutes: number // 0
  buffer_after_minutes: number  // 5
  sort_order: number            // 1
}
```

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `no rows returned` | No hay servicios activos | Insertar seed |
| `permission denied` | RLS bloquea — usuario no autenticado | Llamar solo con sesión activa |

---

## 2. Obtener slots disponibles

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.get_available_slots` |
| **Rol permitido** | `owner`, `client` |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('get_available_slots', {
    p_service_id: serviceId,    // uuid del servicio seleccionado
    p_week_start: '2026-04-27'  // lunes de la semana deseada (YYYY-MM-DD)
  })
```

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `p_service_id` | `uuid` | ✅ | ID del servicio a consultar |
| `p_week_start` | `date` (string YYYY-MM-DD) | ✅ | Primer día de la semana (se recomienda siempre lunes) |

**Respuesta esperada:**

```typescript
type AvailableSlot = {
  slot_start_at: string  // ISO 8601 con zona horaria, ej: "2026-04-28T14:00:00+00:00"
  slot_end_at: string    // slot_start_at + duration_minutes del servicio
}
// Array de AvailableSlot[], vacío si no hay disponibilidad
```

**Notas importantes:**
- `slot_start_at` y `slot_end_at` NO incluyen los buffers. Son las horas visibles para el cliente.
- Los buffers se aplican internamente al verificar conflictos.
- Los slots excluyen automáticamente: días sin disponibilidad base, bloqueos, incidencias activas y citas ya existentes.
- Si la semana es la actual, los slots pasados del día actual también se excluyen por la función.

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `Service not found or inactive` | `p_service_id` no existe o `is_active = false` | Verificar ID del servicio |
| `Business settings not configured` | No hay fila en `business_settings` | Ejecutar seed y configurar `business_settings` |
| Array vacío | Sin disponibilidad esa semana | Mostrar "Sin horarios disponibles" |

---

## 3. Solicitar una cita (cliente)

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.create_appointment_request` |
| **Rol permitido** | `client` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('create_appointment_request', {
    p_service_id: serviceId,              // uuid
    p_start_at: '2026-04-28T14:00:00+00:00', // ISO 8601 — el slot_start_at devuelto por get_available_slots
    p_notes: 'Quisiera fade alto'         // opcional
  })
```

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `p_service_id` | `uuid` | ✅ | Servicio seleccionado |
| `p_start_at` | `timestamptz` | ✅ | Inicio del slot seleccionado (el `slot_start_at` de get_available_slots) |
| `p_notes` | `text` | ❌ | Notas adicionales del cliente |

**Respuesta esperada:**

```typescript
type Appointment = {
  id: string
  client_id: string
  service_id: string
  status: 'pending_owner_approval'   // siempre este valor al crear
  requested_start_at: string
  requested_end_at: string
  time_range: string | null
  notes: string | null
  created_at: string
  // ... resto de columnas de booking.appointments
}
```

**Efectos secundarios:**
- Crea un `notification_event` con `event_type = 'appointment_requested'` para notificar al owner.
- Registra la transición de estado en `appointment_status_history`.

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `Authenticated client profile not found` | El usuario autenticado no tiene fila en `booking.clients` | Crear el cliente antes de agendar |
| `Service not found or inactive` | El servicio fue desactivado | Recargar lista de servicios |
| `Selected slot is not available` | El slot fue tomado entre `get_available_slots` y la solicitud (race condition) | Mostrar "El horario ya no está disponible, elige otro" y recargar slots |

---

## 4. Obtener citas del cliente

| Campo | Valor |
|---|---|
| **Tipo** | Direct query |
| **Tabla** | `booking.appointments` |
| **Rol permitido** | `client` |

**SDK call — citas activas:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .from('appointments')
  .select(`
    id,
    status,
    requested_start_at,
    requested_end_at,
    notes,
    cancellation_reason,
    created_at,
    services:service_id ( name, duration_minutes )
  `)
  .not('status', 'in', '("completed","no_show","client_cancelled","owner_cancelled","rejected_by_owner")')
  .order('requested_start_at', { ascending: true })
```

**SDK call — historial completo:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .from('appointments')
  .select(`
    id,
    status,
    requested_start_at,
    requested_end_at,
    notes,
    cancellation_reason,
    created_at,
    services:service_id ( name, duration_minutes )
  `)
  .order('requested_start_at', { ascending: false })
  .limit(50)
```

**Nota:** RLS aplica automáticamente `WHERE client_id = current_client_id()`. El cliente solo ve sus propias citas.

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| Array vacío | El cliente no tiene citas | Mostrar estado vacío |
| `permission denied` | Usuario no autenticado o no es cliente | Verificar sesión activa |

---

## 5. Obtener agenda del owner

| Campo | Valor |
|---|---|
| **Tipo** | Direct query |
| **Tabla** | `booking.appointments` |
| **Rol permitido** | `owner` únicamente |

**SDK call — agenda del día:**

```typescript
const hoy = new Date().toISOString().split('T')[0]  // YYYY-MM-DD
const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const { data, error } = await supabase
  .schema('booking')
  .from('appointments')
  .select(`
    id,
    status,
    requested_start_at,
    requested_end_at,
    notes,
    clients:client_id ( id, full_name, phone ),
    services:service_id ( name, duration_minutes )
  `)
  .gte('requested_start_at', `${hoy}T00:00:00+00:00`)
  .lt('requested_start_at', `${manana}T00:00:00+00:00`)
  .not('status', 'in', '("client_cancelled","owner_cancelled","rejected_by_owner")')
  .order('requested_start_at', { ascending: true })
```

**Nota:** RLS otorga al owner acceso total a todas las filas de `booking.appointments`.

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `permission denied` | Usuario no tiene `role = 'owner'` en `booking.profiles` | Verificar rol en profiles |

---

## 6. Obtener solicitudes pendientes de aprobación

| Campo | Valor |
|---|---|
| **Tipo** | Direct query |
| **Tabla** | `booking.appointments` |
| **Rol permitido** | `owner` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .from('appointments')
  .select(`
    id,
    status,
    requested_start_at,
    requested_end_at,
    notes,
    created_at,
    clients:client_id ( id, full_name, phone ),
    services:service_id ( name, duration_minutes )
  `)
  .eq('status', 'pending_owner_approval')
  .order('created_at', { ascending: true })  // primero en llegar, primero en atender
```

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| Array vacío | No hay solicitudes pendientes | Mostrar estado vacío "Sin solicitudes" |

---

## 7. Aprobar una cita

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.owner_approve_appointment` |
| **Rol permitido** | `owner` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('owner_approve_appointment', {
    p_appointment_id: appointmentId,  // uuid
    p_note: 'Confirmado, te esperamos' // opcional
  })
```

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `p_appointment_id` | `uuid` | ✅ | ID de la cita a aprobar |
| `p_note` | `text` | ❌ | Nota para el cliente |

**Respuesta esperada:** fila completa de `booking.appointments` con `status = 'awaiting_client_confirmation'`

**Efectos secundarios:**
- Crea `notification_event` con `event_type = 'appointment_approved'`
- Re-verifica disponibilidad con `FOR UPDATE` (lock) para evitar race conditions
- Registra cambio en `appointment_status_history`

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `Only owner can approve appointments` | Usuario no es owner | Verificar sesión y rol |
| `Appointment is not pending owner approval` | La cita ya fue procesada (aprobada, rechazada, etc.) | Recargar la lista de solicitudes |
| `Appointment slot is no longer available` | Otro cliente tomó ese horario antes de que se aprobara | Notificar al owner, rechazar y pedir al cliente que elija otro horario |

---

## 8. Rechazar una cita

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.owner_reject_appointment` |
| **Rol permitido** | `owner` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('owner_reject_appointment', {
    p_appointment_id: appointmentId,
    p_reason: 'Ya tengo esa hora ocupada'  // opcional pero muy recomendado
  })
```

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `p_appointment_id` | `uuid` | ✅ | ID de la cita a rechazar |
| `p_reason` | `text` | ❌ | Motivo del rechazo (se envía al cliente por WhatsApp) |

**Respuesta esperada:** fila de `booking.appointments` con `status = 'rejected_by_owner'`

**Efectos secundarios:**
- Crea `notification_event` con `event_type = 'appointment_rejected'`
- Registra cambio en `appointment_status_history`

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `Only owner can reject appointments` | Usuario no es owner | Verificar sesión y rol |
| `Appointment not found or not pending` | La cita ya fue procesada o el ID es incorrecto | Recargar lista |

---

## 9. Cancelar una cita

### 9a. Cancelación por el cliente

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.client_cancel_appointment` |
| **Rol permitido** | `client` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('client_cancel_appointment', {
    p_appointment_id: appointmentId,
    p_reason: 'No puedo ir ese día'  // opcional
  })
```

**Estados desde los que se puede cancelar:** `pending_owner_approval`, `confirmed_by_owner`, `awaiting_client_confirmation`, `client_confirmed`, `reschedule_required`

**Respuesta esperada:** fila con `status = 'client_cancelled'`

**Efectos secundarios:**
- Crea `notification_event` con `event_type = 'appointment_client_cancelled'`

---

### 9b. Cancelación por el owner

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.owner_cancel_appointment` |
| **Rol permitido** | `owner` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('owner_cancel_appointment', {
    p_appointment_id: appointmentId,
    p_reason: 'Tuve una emergencia'   // REQUERIDO para cancelación por owner
  })
```

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `p_appointment_id` | `uuid` | ✅ | ID de la cita |
| `p_reason` | `text` | ✅ | Motivo obligatorio (se envía al cliente) |

**Respuesta esperada:** fila con `status = 'owner_cancelled'`

**Efectos secundarios:**
- Crea `notification_event` con `event_type = 'appointment_owner_cancelled'`

**Errores comunes (ambas cancelaciones):**

| Error | Causa | Solución |
|---|---|---|
| `Appointment not found or cannot be cancelled` | La cita ya está en un estado terminal (`completed`, `no_show`, etc.) | Recargar lista |

---

## 10. Completar una cita

| Campo | Valor |
|---|---|
| **Tipo** | RPC |
| **Función** | `booking.owner_complete_appointment` |
| **Rol permitido** | `owner` únicamente |

**SDK call:**

```typescript
const { data, error } = await supabase
  .schema('booking')
  .rpc('owner_complete_appointment', {
    p_appointment_id: appointmentId,
    p_note: null  // opcional
  })
```

**Estados desde los que se puede completar:** `confirmed_by_owner`, `awaiting_client_confirmation`, `client_confirmed`, `reschedule_required`

**Respuesta esperada:** fila con `status = 'completed'`

**Nota:** El slot queda liberado para nuevas citas una vez que la cita está en `completed`. El trigger de validación de slot solo bloquea estados activos.

**Errores comunes:**

| Error | Causa | Solución |
|---|---|---|
| `Only owner can complete appointments` | Usuario no es owner | Verificar sesión y rol |
| `Appointment not found or cannot be completed` | Estado no permite completar (ej: `pending_owner_approval`) | Verificar estado actual de la cita |

---

## Acciones adicionales del owner

Estas RPCs existen en el schema y pueden usarse en el futuro:

### Marcar no-show

```typescript
supabase.schema('booking').rpc('owner_mark_no_show', {
  p_appointment_id: appointmentId,
  p_note: null
})
// → status = 'no_show'
```

### Solicitar reprogramación

```typescript
supabase.schema('booking').rpc('owner_mark_reschedule_required', {
  p_appointment_id: appointmentId,
  p_reason: 'Motivo obligatorio'  // p_reason es REQUERIDO
})
// → status = 'reschedule_required'
```

### Confirmar cita por el cliente (vía mini app o respuesta WhatsApp)

```typescript
supabase.schema('booking').rpc('client_confirm_appointment', {
  p_appointment_id: appointmentId
})
// → status = 'client_confirmed'
```

---

## Mapa de estados de una cita

```
                       ┌─────────────────────────┐
                       │  pending_owner_approval  │ ← create_appointment_request
                       └─────────┬───────┬────────┘
                                 │       │
                    owner_approve│       │owner_reject
                                 │       │
                    ┌────────────▼──┐  ┌─▼───────────────┐
                    │awaiting_client│  │ rejected_by_owner│ (terminal)
                    │ confirmation  │  └──────────────────┘
                    └──────┬────────┘
                           │
              client_confirm│
                           │
              ┌────────────▼──────┐
              │  client_confirmed  │
              └──┬──────────────┬──┘
                 │              │
     owner_complete│            │owner_mark_no_show
                 │              │
        ┌────────▼──┐    ┌──────▼──┐
        │ completed │    │ no_show │  (terminales)
        └───────────┘    └─────────┘

  Desde cualquier estado activo:
  → client_cancel → client_cancelled  (terminal)
  → owner_cancel  → owner_cancelled   (terminal)
  → owner_mark_reschedule_required → reschedule_required
```

---

## Convenciones de manejo de errores en el frontend

```typescript
const { data, error } = await supabase.schema('booking').rpc('...')

if (error) {
  // error.message contiene el mensaje del RAISE EXCEPTION de PostgreSQL
  // Ejemplo: "Selected slot is not available"
  
  // Mapear a mensajes en español para el usuario:
  const userMessages: Record<string, string> = {
    'Selected slot is not available': 'Este horario ya no está disponible. Por favor elige otro.',
    'Service not found or inactive': 'El servicio seleccionado ya no está disponible.',
    'Authenticated client profile not found': 'No encontramos tu perfil. Contacta al estudio.',
    'Only owner can approve appointments': 'No tienes permiso para esta acción.',
    // ... etc
  }
  
  const mensaje = userMessages[error.message] ?? 'Ocurrió un error. Intenta de nuevo.'
  // mostrar mensaje al usuario
}
```

---

_Última revisión: 2026-04-26_  
_Próxima actualización: cuando se implemente Fase 2 (integración real frontend-Supabase)_
