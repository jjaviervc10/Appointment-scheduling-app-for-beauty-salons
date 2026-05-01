# Database Overview — Jaquelina López Barber Studio

Todo vive en el schema `booking` de Supabase/PostgreSQL.

> **Nota:** Este documento refleja el estado real verificado desde las funciones SQL del proyecto. Pendiente completar con enums, tablas y políticas RLS (ver sección "Schema pendiente de capturar").

---

## Enums

| Enum | Valores verificados |
|---|---|
| `user_role` | `owner`, `client` |
| `appointment_status` | `pending_owner_approval`, `confirmed_by_owner`, `awaiting_client_confirmation`, `client_confirmed`, `completed`, `no_show`, `reschedule_required`, `rejected_by_owner`, `owner_cancelled`, `client_cancelled` |
| `incident_status` | `active` (confirmado), otros pendientes de verificar |
| `inbound_message_intent` | `booking`, `reschedule`, `cancel`, `confirm`, `availability`, `late`, `location`, `price`, `hours`, `human_help`, `greeting`, `thanks`, `unknown` |
| `block_type` | Pendiente de verificar |
| `message_channel` | Pendiente de verificar |
| `message_type` | Pendiente de verificar |
| `message_delivery_status` | Pendiente de verificar |
| `customer_response_type` | Pendiente de verificar |
| `notification_event_type` | `appointment_requested`, `appointment_approved`, `appointment_rejected`, `appointment_client_confirmed`, `appointment_client_cancelled`, `appointment_owner_cancelled`, `appointment_reschedule_required`, `incident_created`, `incident_clients_notification_due` (confirmados desde RPCs) |
| `notification_event_status` | Pendiente de verificar |

---

## Tablas

### `profiles`
Extiende `auth.users` de Supabase. Almacena rol y datos básicos del usuario.

| Campo clave | Descripción |
|---|---|
| `id` | UUID, igual al `id` de `auth.users` |
| `role` | `user_role` — `owner` o `client` |
| `is_active` | Si el usuario está activo |

---

### `business_settings`
Configuración global del negocio. Una sola fila.

| Campo clave | Descripción |
|---|---|
| `timezone` | Zona horaria del negocio (ej. `America/Mexico_City`) |
| `slot_granularity_minutes` | Intervalo en minutos para generar slots disponibles |

---

### `clients`
Clientes del estudio. Pueden o no tener cuenta en `auth.users`.

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `full_name` | Nombre completo del cliente |
| `phone` | Teléfono (usado para WhatsApp) |
| `profile_id` | FK a `auth.users` (nullable — cliente puede no tener cuenta) |

---

### `services`
Servicios que ofrece el estudio (corte, barba, etc.).

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `name` | Nombre del servicio |
| `duration_minutes` | Duración del servicio en minutos |
| `buffer_before_minutes` | Tiempo de buffer antes del servicio |
| `buffer_after_minutes` | Tiempo de buffer después del servicio |
| `is_active` | Si está activo o no |

---

### `weekly_availability`
Define los días y horarios habituales de trabajo.

| Campo clave | Descripción |
|---|---|
| `day_of_week` | 0 (domingo) a 6 (sábado) |
| `start_time` | Hora de inicio |
| `end_time` | Hora de fin |
| `is_active` | Si ese día está habilitado |

---

### `time_blocks`
Bloqueos de agenda. Pueden ser específicos (una fecha) o recurrentes (mismo día cada semana).

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `start_time` | Hora de inicio del bloqueo |
| `end_time` | Hora de fin del bloqueo |
| `is_recurring` | Si se repite semanalmente |
| `day_of_week` | Día de la semana (para bloques recurrentes) |
| `specific_date` | Fecha específica (para bloques no recurrentes) |
| `is_active` | Si el bloqueo está activo |

---

### `incidents`
Incidencias que pueden afectar múltiples citas (enfermedad, emergencia, etc.).

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `title` | Título corto de la incidencia |
| `description` | Descripción detallada |
| `status` | `incident_status` (ej. `active`) |
| `time_range` | Rango de tiempo afectado (`tstzrange`) |
| `notify_clients` | Si se deben notificar a los clientes impactados |
| `created_by` / `updated_by` | UUID del usuario que creó/modificó |

---

### `appointments`
Tabla central. Representa cada cita.

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `client_id` | FK a `clients` |
| `service_id` | FK a `services` |
| `status` | `appointment_status` |
| `requested_start_at` | Inicio de la cita (incluye buffer antes) |
| `requested_end_at` | Fin de la cita (incluye buffer después) |
| `time_range` | Rango calculado (`tstzrange`) — usado para detectar conflictos |
| `notes` | Notas del cliente |
| `cancellation_reason` | Razón de cancelación o reprogramación |
| `owner_response_at` | Timestamp cuando el owner aprobó/rechazó |
| `client_response_at` | Timestamp cuando el cliente confirmó/canceló |
| `created_by` / `updated_by` | UUID del usuario que creó/modificó |

---

### `appointment_status_history`
Historial de cambios de estado de cada cita. Permite auditoría.

| Campo clave | Descripción |
|---|---|
| `appointment_id` | FK a `appointments` |
| `old_status` | Estado anterior |
| `new_status` | Estado nuevo |
| `changed_at` | Timestamp del cambio |
| `changed_by` | UUID del usuario que hizo el cambio |

---

### `message_templates`
Templates de mensajes para WhatsApp (uso futuro).

---

### `outbound_messages`
Registro de mensajes enviados desde el sistema.

---

### `inbound_messages`
Registro de mensajes recibidos (WhatsApp webhook, uso futuro).

---

### `notification_events`
Cola de eventos de notificación pendientes de procesar.

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `event_type` | `notification_event_type` |
| `appointment_id` | FK a `appointments` (nullable) |
| `client_id` | FK a `clients` (nullable) |
| `incident_id` | FK a `incidents` (nullable) |
| `payload` | JSONB con datos adicionales del evento |

---

### `mini_app_tokens`
Tokens temporales para acceder a la mini app desde WhatsApp (uso futuro).

| Campo clave | Descripción |
|---|---|
| `id` | UUID |
| `token` | Token único (hex de 32 bytes) |
| `phone` | Teléfono pre-cargado en el token |
| `full_name` | Nombre pre-cargado en el token |
| `purpose` | Propósito del token (ej. `booking`) |
| `client_id` | FK a `clients` (nullable) |
| `appointment_id` | FK a `appointments` (nullable) |
| `expires_at` | Expiración del token |
| `is_active` | Si el token sigue vigente |

---

## RPCs (Stored Procedures)

### Utilidades de sesión

| RPC | Firma real | Descripción |
|---|---|---|
| `is_owner` | `is_owner(p_user_id uuid) → boolean` | Verifica si un UUID dado tiene rol `owner` activo |
| `is_current_user_owner` | `is_current_user_owner() → boolean` | Wrapper: llama `is_owner(auth.uid())` |
| `current_client_id` | `current_client_id() → uuid` | Retorna `clients.id` del usuario autenticado via `profile_id` |

### Disponibilidad

| RPC | Firma real | Descripción |
|---|---|---|
| `is_slot_available` | `is_slot_available(p_start_at timestamptz, p_end_at timestamptz, p_exclude_appointment_id uuid) → boolean` | Verifica disponibilidad considerando: availability, time_blocks (específicos y recurrentes), incidents activos, y citas activas |
| `get_available_slots` | `get_available_slots(p_service_id uuid, p_week_start date) → TABLE(slot_start_at, slot_end_at)` | Genera todos los slots disponibles para una semana completa |

### Ciclo de vida de citas

| RPC | Firma real | Descripción |
|---|---|---|
| `create_appointment_request` | `(p_service_id, p_start_at, p_notes?) → appointments` | Crea cita en `pending_owner_approval`. Calcula buffers automáticamente |
| `owner_approve_appointment` | `(p_appointment_id, p_note?) → appointments` | Mueve a `awaiting_client_confirmation`. Re-verifica disponibilidad |
| `owner_reject_appointment` | `(p_appointment_id, p_reason?) → appointments` | Mueve a `rejected_by_owner` |
| `client_confirm_appointment` | `(p_appointment_id) → appointments` | Mueve de `awaiting_client_confirmation` → `client_confirmed` |
| `client_cancel_appointment` | `(p_appointment_id, p_reason?) → appointments` | Mueve a `client_cancelled` |
| `owner_cancel_appointment` | `(p_appointment_id, p_reason) → appointments` | Mueve a `owner_cancelled`. Reason obligatorio |
| `owner_complete_appointment` | `(p_appointment_id, p_note?) → appointments` | Mueve a `completed` |
| `owner_mark_no_show` | `(p_appointment_id, p_note?) → appointments` | Mueve a `no_show` |
| `owner_mark_reschedule_required` | `(p_appointment_id, p_reason) → appointments` | Mueve a `reschedule_required`. Reason obligatorio |

> Todas las RPCs de ciclo de vida emiten un `notification_event` automáticamente al ejecutarse.

### Incidencias

| RPC | Firma real | Descripción |
|---|---|---|
| `create_incident` | `(p_title, p_description, p_start_at, p_end_at, p_notify_clients?) → incidents` | Crea incidencia con `time_range`. Emite eventos de notificación |
| `get_incident_impacted_appointments` | `(p_incident_id) → TABLE(appointment_id, client_id, client_name, phone, ...)` | Lista citas activas que colisionan con el `time_range` de la incidencia |

### Triggers internos (no se llaman directamente)

| Función | Cuándo se ejecuta |
|---|---|
| `set_updated_at()` | Antes de UPDATE en tablas con `updated_at` |
| `log_appointment_status_change()` | Después de INSERT/UPDATE en `appointments` — escribe en `appointment_status_history` |
| `validate_appointment_slot()` | Antes de INSERT/UPDATE en `appointments` — valida disponibilidad del slot |
| `set_inbound_message_intent()` | Antes de INSERT en `inbound_messages` — clasifica la intención |

### Mini app / WhatsApp (uso futuro)

| RPC | Firma real | Descripción |
|---|---|---|
| `create_mini_app_token` | `(p_phone?, p_full_name?, p_purpose?, p_client_id?, p_appointment_id?, p_expires_in_minutes?) → mini_app_tokens` | Solo owner puede crear. Token = hex 32 bytes |
| `validate_mini_app_token` | `(p_token text) → TABLE(token_id, purpose, phone, full_name, client_id, appointment_id)` | Verifica que el token exista, esté activo y no haya expirado |
| `detect_inbound_intent` | `(p_body text) → TABLE(intent, confidence, matched_keywords, needs_human_review, normalized_body)` | Clasifica por regex en orden de prioridad. Nunca usa IA |
| `normalize_inbound_text` | `(p_text text) → text` | Minúsculas + sin tildes + trim + colapsa espacios |

---

## Schema pendiente de capturar

Para completar la migración inicial se necesitan las siguientes queries en el SQL Editor de Supabase:

### 1. Definición completa de tablas

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'booking'
ORDER BY table_name, ordinal_position;
```

### 2. Valores reales de todos los enums

```sql
SELECT t.typname AS enum_name, e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'booking'
ORDER BY t.typname, e.enumsortorder;
```

### 3. Índices

```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'booking'
ORDER BY tablename;
```

### 4. Políticas RLS

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'booking'
ORDER BY tablename;
```

### 5. Foreign keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'booking'
ORDER BY tc.table_name;
```

