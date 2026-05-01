# Plan de Desarrollo — Jaquelina López Barber Studio Backend

Este documento describe las fases del desarrollo backend en orden de prioridad.

---

## Fase 1 — Migración actual y seed inicial

**Objetivo:** Capturar el estado actual de la base de datos en código versionado.

**Tareas:**
- [ ] Exportar el schema `booking` completo desde Supabase (tablas, enums, funciones, RLS) usando la CLI
- [ ] Guardar como `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql`
- [ ] Crear `supabase/seed/seed.sql` con datos de prueba:
  - Owner (usuario y perfil)
  - Servicios básicos (corte, barba, combo)
  - Disponibilidad semanal de prueba
  - 2-3 clientes de ejemplo
  - 1-2 citas en distintos estados
- [ ] Verificar que `supabase db reset` funcione en local

**Criterio de éxito:** Un desarrollador puede clonar el repo, correr `supabase start` y `supabase db reset` y tener una base de datos funcional con datos de prueba.

---

## Fase 2 — Conectar frontend a Supabase / RPCs

**Objetivo:** Reemplazar el mock data del frontend con datos reales de Supabase.

**Tareas:**
- [ ] Configurar el cliente Supabase en el frontend (variables de entorno)
- [ ] Implementar autenticación (login del owner, login del cliente)
- [ ] Conectar pantalla de servicios → tabla `services`
- [ ] Conectar pantalla de disponibilidad → RPC `get_available_slots()`
- [ ] Conectar flujo de solicitud de cita → RPC `create_appointment_request()`
- [ ] Conectar panel del owner → RPCs de aprobación, rechazo, completar
- [ ] Conectar historial de citas → tabla `appointments` + `appointment_status_history`
- [ ] Verificar RLS: cada rol solo ve lo que debe ver

**Criterio de éxito:** La app funciona con datos reales. El owner puede gestionar citas. El cliente puede solicitarlas.

---

## Fase 3 — Mini app tokenizada

**Objetivo:** Permitir que un cliente acceda a una mini app web desde un link de WhatsApp, sin necesidad de crear cuenta.

**Tareas:**
- [ ] Diseñar la mini app (flujo mínimo: nombre + celular + solicitar cita)
- [ ] Crear Edge Function: `generate-mini-app-link` (usa `create_mini_app_token()`)
- [ ] Crear Edge Function: `mini-app-session` (usa `validate_mini_app_token()`)
- [ ] Implementar expiración de tokens
- [ ] Crear vista web mínima (puede ser una página simple, no React Native)

**Criterio de éxito:** El owner puede generar un link. El cliente accede con el link, ingresa sus datos y puede ver/solicitar citas sin tener cuenta.

---

## Fase 4 — WhatsApp webhook

**Objetivo:** Recibir y procesar mensajes de WhatsApp enviados por clientes.

**Tareas:**
- [ ] Configurar cuenta de WhatsApp Business API (Meta)
- [ ] Crear Edge Function: `whatsapp-webhook` (recibe mensajes, valida firma)
- [ ] Clasificar intención del mensaje: `detect_inbound_intent()` + `normalize_inbound_text()`
- [ ] Guardar mensaje en `inbound_messages`
- [ ] Disparar respuesta automática básica según intención
- [ ] Registrar mensaje outbound en `outbound_messages`

**Criterio de éxito:** Un cliente puede enviar un WhatsApp y recibir una respuesta automática básica. Los mensajes quedan registrados.

---

## Fase 5 — Notificaciones y recordatorios

**Objetivo:** Enviar recordatorios automáticos a clientes antes de sus citas.

**Tareas:**
- [ ] Diseñar templates de mensajes en `message_templates`
- [ ] Crear Edge Function o pg_cron job: `send-reminders`
  - Busca citas confirmadas con N horas de anticipación
  - Genera evento en `notification_events`
  - Envía mensaje via WhatsApp
- [ ] Implementar reintentos para mensajes fallidos
- [ ] Registrar estado de entrega en `message_delivery_status`

**Criterio de éxito:** Los clientes reciben un recordatorio automático X horas antes de su cita.

---

## Notas generales

- Cada fase debe completarse y probarse antes de iniciar la siguiente.
- No hay pagos en ninguna fase del MVP.
- WhatsApp es complementario; la app principal siempre tiene prioridad.
