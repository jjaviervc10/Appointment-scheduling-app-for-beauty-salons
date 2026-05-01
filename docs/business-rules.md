# Reglas de Negocio — Jaquelina López Barber Studio

Este documento define cómo funciona el negocio. Es la referencia principal para tomar decisiones de diseño en base de datos, RLS y Edge Functions.

---

## 1. El negocio

- Es una barber studio de una sola owner (Jaquelina López).
- **No es multi-salón.** Toda la lógica asume una sola agenda, una sola dueña.
- No hay empleados adicionales en el MVP.

---

## 2. Roles

| Rol | Descripción |
|---|---|
| `owner` | La dueña del negocio. Tiene acceso total. |
| `client` | Cliente registrado. Acceso limitado a sus propias citas. |

La función RPC `is_owner()` verifica si el usuario autenticado es el owner.

---

## 3. Flujo de una cita

```
Cliente solicita → Owner aprueba/rechaza → Cliente confirma → Completada o cancelada
```

### Estados posibles (`appointment_status`)

| Estado | Quién lo asigna | Descripción |
|---|---|---|
| `pending_approval` | Sistema | Solicitud inicial del cliente |
| `approved` | Owner | Owner aprueba, espera confirmación del cliente |
| `confirmed` | Cliente | Cliente confirma el turno aprobado |
| `completed` | Owner | El corte terminó, el turno se libera |
| `cancelled_by_owner` | Owner | Owner cancela |
| `cancelled_by_client` | Cliente | Cliente cancela |
| `no_show` | Owner | El cliente no se presentó |
| `reschedule_required` | Owner | Requiere reprogramación (por incidencia, etc.) |

### Reglas críticas del flujo

1. Un cliente **solo puede solicitar**, no confirmar ni aprobar por su cuenta.
2. El owner **aprueba o rechaza** la solicitud.
3. Al aprobar, la cita puede quedar en `approved` esperando que el cliente confirme.
4. El owner marca `completed` cuando termina el corte y libera el slot.
5. **Acciones sensibles** (cancelar, reprogramar) no se ejecutan sin contexto explícito. El sistema debe pedir confirmación antes.

---

## 4. Disponibilidad y bloqueos

- La disponibilidad semanal se define en `weekly_availability` (días y horarios).
- Los bloqueos temporales se registran en `time_blocks` (vacaciones, descansos, imprevistos).
- La RPC `is_slot_available()` verifica si un horario está libre antes de crear una cita.
- La RPC `get_available_slots()` devuelve los horarios disponibles para una fecha dada.

---

## 5. Incidencias

- Una incidencia (`incidents`) representa un evento que impacta la agenda (enfermedad, emergencia, etc.).
- La RPC `get_incident_impacted_appointments()` lista las citas afectadas por una incidencia.
- Las citas afectadas pueden moverse a `reschedule_required`.

---

## 6. Clientes

- Un cliente puede estar registrado con nombre y celular mínimamente.
- El cliente puede tener cuenta en la app (usuario autenticado) o solo estar en `clients` (registro básico).
- La función `current_client_id()` resuelve el `client_id` del usuario autenticado actual.

---

## 7. Mini app tokenizada (WhatsApp — Fase futura)

- Desde WhatsApp, el cliente puede acceder a una mini app con un token temporal.
- El token se crea con `create_mini_app_token()` y se valida con `validate_mini_app_token()`.
- La mini app debe permitir como mínimo: registrar nombre y celular.
- **No implementar en MVP.**

---

## 8. Mensajería (WhatsApp — Fase futura)

- WhatsApp es un canal **complementario**, no el principal.
- Los mensajes outbound se registran en `outbound_messages`.
- Los mensajes inbound se registran en `inbound_messages`.
- La intención de los mensajes inbound se clasifica con reglas simples (no IA): `detect_inbound_intent()` y `normalize_inbound_text()`.
- Los eventos de notificación se gestionan en `notification_events`.
- Los templates de mensajes están en `message_templates`.
- **No implementar en MVP.**

---

## 9. Pagos

- No hay pagos en el MVP.

---

## 10. Fuente de verdad

- La app principal (React Native + Expo) es la fuente de verdad para la gestión del negocio.
- El backend (Supabase) es la fuente de verdad para los datos.
