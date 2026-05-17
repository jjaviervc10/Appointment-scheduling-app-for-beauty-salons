# WhatsApp Message Format — Jaquelina López Barber Studio

Diseño técnico del formato de mensajes WhatsApp. Organizado por fases de madurez.

---

## Estado actual (antes de mejoras)

Los mensajes salientes son texto plano sin estructura, con el link crudo al final:

```
Hola Javivi, recibimos tu solicitud de cita para Corte. La revisaremos y te confirmaremos pronto.
```

```
Para agendar tu cita visita: https://barberjaquelinalopezstudio.netlify.app/miniapp/booking?phone=...&token=...&returnUrl=...
```

Problemas:
- El link completo es largo y se ve técnico.
- No hay jerarquía visual.
- Sin negritas, sin emojis.
- No hay CTA claro antes del link.
- El usuario no sabe qué esperar después de tocar el link.

---

## Fase 1 — Texto enriquecido (IMPLEMENTADA)

Sin cambiar proveedor ni APIs. Solo mejorar el body del mensaje de texto.

WhatsApp soporta en texto plano:
- `*texto*` → **negrita**
- `_texto_` → _cursiva_
- `~texto~` → ~~tachado~~
- ` ```texto``` ` → monoespaciado
- Saltos de línea con `\n`
- Emojis Unicode

### Reglas de formato

1. Encabezado en negrita con nombre del negocio.
2. Saludo corto.
3. Cuerpo del mensaje.
4. Línea vacía antes del CTA.
5. CTA en negrita seguido del link en la línea siguiente.
6. Footer informativo cuando aplique.
7. Máximo 2–3 emojis por mensaje.
8. Sin links crudos solos — siempre precedidos de CTA.

### Formatos por intent

#### Menú inicial (`greeting` / primera interacción)

```
✂️ *Jaquelina López Barber Studio*

Hola, soy el asistente del estudio.
¿En qué te puedo ayudar?

1️⃣ Agendar cita
2️⃣ Ver horarios disponibles
3️⃣ Reprogramar cita
4️⃣ Cancelar cita
5️⃣ Hablar con el estudio

Responde con el número de la opción.
```

#### Agendar cita (`booking` / opción 1)

```
✂️ *Jaquelina López Barber Studio*

¡Hola! Te ayudo a reservar tu cita.

Para elegir tu servicio, día y horario toca aquí:

👉 *Reservar mi cita*
{{miniappLink}}

Tu solicitud quedará pendiente de aprobación.
```

#### Disponibilidad (`availability` / opción 2)

```
✂️ *Jaquelina López Barber Studio*

Puedes ver los horarios disponibles y agendar directamente aquí:

👉 *Ver disponibilidad*
{{miniappLink}}
```

#### Reprogramar (`reschedule` / opción 3)

```
🔁 *Reprogramar cita*

Para elegir un nuevo horario toca aquí:

👉 *Reprogramar mi cita*
{{miniappLink}}

El cambio quedará pendiente de confirmación.
```

#### Cancelar (`cancel` / opción 4)

```
❌ *Cancelar cita*

Para cancelar tu cita toca aquí:

👉 *Cancelar mi cita*
{{miniappLink}}

Solo puedes cancelar hasta 2 horas antes de tu cita.
```

#### Emergencia / llamada directa (`human_help` / opción 5)

```
📞 *Cita de emergencia*

Entiendo que necesitas atención urgente.

Por favor usa esta opción solo si realmente lo necesitas.
Mis horarios son limitados y este espacio es para verdaderas emergencias.

Puedes llamarme directamente aquí:
*{{emergencyPhone}}*

Solo llamadas directas. No se agenda por este canal.
```

#### Precios / servicios (`price`)

```
💈 *Servicios y precios*

Puedes consultar los servicios disponibles aquí:

👉 *Ver servicios*
{{miniappLink}}
```

#### Horarios (`hours`)

```
🕐 *Horarios del estudio*

Los horarios actualizados están en:

👉 *Ver disponibilidad*
{{miniappLink}}
```

#### Ubicación (`location`)

```
📍 *Ubicación del estudio*

{{businessAddress}}

Puedes coordinar tu cita aquí:

👉 *Agendar cita*
{{miniappLink}}
```

#### Confirmación de cita (notificación outbound — `confirmation`)

```
✂️ *Jaquelina López Barber Studio*

Hola {{clientName}}, recibimos tu solicitud de cita para *{{serviceName}}*.

La revisaremos y te confirmaremos pronto por aquí.
```

#### Aprobación de cita (notificación outbound — `owner_approval_result` aprobado)

```
✅ *Cita aprobada*

Hola {{clientName}}, tu cita para *{{serviceName}}* fue aprobada.

📅 *{{date}}*
🕐 *{{time}}*

Te esperamos.
```

#### Rechazo de cita (notificación outbound — `owner_approval_result` rechazado)

```
❌ *Cita no disponible*

Hola {{clientName}}, lamentablemente no podemos confirmar tu cita para *{{serviceName}}*.

{{reason}}

Si quieres intentar con otro horario:

👉 *Agendar nueva cita*
{{miniappLink}}
```

#### Recordatorio (notificación outbound — `reminder`)

```
📅 *Recordatorio de cita*

Hola {{clientName}}, te recordamos que mañana tienes cita para *{{serviceName}}*.

🕐 *{{time}}*

Si necesitas cambiarla:

👉 *Reprogramar o cancelar*
{{miniappLink}}
```

#### Intent desconocido (`unknown`)

```
No logré identificar tu mensaje.

Puedes responder con:
1️⃣ Agendar cita
2️⃣ Ver horarios
3️⃣ Reprogramar
4️⃣ Cancelar
5️⃣ Hablar con el estudio
```

---

## Función buildMiniAppLink

El backend debe centralizar la construcción de links a la mini app:

```ts
interface MiniAppLinkOptions {
  baseUrl: string;          // MINIAPP_BASE_URL env var
  intent: 'booking' | 'reschedule' | 'cancel' | 'availability' | 'services';
  phone?: string;           // E.164, url-encoded
  token?: string;           // miniapp token de un solo uso
  source?: string;          // siempre 'whatsapp' para links generados por bot
  returnTo?: string;        // 'whatsapp' para que la mini app muestre CTA de vuelta
}

function buildMiniAppLink(options: MiniAppLinkOptions): string
```

Ejemplo de salida:

```
https://barberjaquelinalopezstudio.netlify.app/miniapp/booking?phone=%2B526143278357&source=whatsapp&returnTo=whatsapp&token=abc123
```

Reglas:
- `source=whatsapp` siempre presente para links del bot (analytics futuros).
- `returnTo=whatsapp` para que la mini app muestre "Volver al chat de WhatsApp".
- `token` solo cuando sea un flujo con cita activa (reschedule, cancel).
- `phone` url-encoded (`+` → `%2B`).
- No hardcodear el base URL — leer de `MINIAPP_BASE_URL` o `FRONTEND_URL`.

---

## Fase 2 — Mensajes interactivos (PRÓXIMA FASE)

WhatsApp Cloud API permite mensajes con botones de respuesta rápida y listas
sin aprobación de templates, siempre que sean en respuesta a un mensaje entrante
(dentro de la ventana de 24 horas).

### Tipo: reply_buttons

Máximo 3 botones. Ejemplo para menú principal:

```json
{
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "✂️ *Jaquelina López Barber Studio*\n\nHola, ¿en qué te puedo ayudar?"
    },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "opt_booking",     "title": "📅 Agendar cita" } },
        { "type": "reply", "reply": { "id": "opt_reschedule",  "title": "🔁 Reprogramar" } },
        { "type": "reply", "reply": { "id": "opt_cancel",      "title": "❌ Cancelar" } }
      ]
    }
  }
}
```

### Tipo: list (más de 3 opciones)

Recomendado para el menú de 5 opciones:

```json
{
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "✂️ Jaquelina López Barber Studio" },
    "body":   { "text": "Hola, soy el asistente del estudio.\n¿En qué te puedo ayudar?" },
    "footer": { "text": "Toca para ver las opciones" },
    "action": {
      "button": "Ver opciones",
      "sections": [
        {
          "title": "Citas",
          "rows": [
            { "id": "opt_booking",       "title": "Agendar cita",           "description": "Reserva un nuevo turno" },
            { "id": "opt_availability",  "title": "Ver horarios",           "description": "Consulta disponibilidad" },
            { "id": "opt_reschedule",    "title": "Reprogramar cita",       "description": "Cambia tu turno actual" },
            { "id": "opt_cancel",        "title": "Cancelar cita",          "description": "Cancela tu turno" },
            { "id": "opt_human",         "title": "Hablar con el estudio",  "description": "Cita de emergencia o consulta directa" }
          ]
        }
      ]
    }
  }
}
```

Limitaciones:
- Solo funciona dentro de ventana de conversación de 24 h (el cliente escribió primero).
- No funciona para notificaciones proactivas (aprobaciones, recordatorios).
- Los IDs de botón deben procesarse en el webhook como inbound interactivo.
- Requiere manejo del tipo `interactive` en el webhook handler.

Pendiente para implementar Fase 2:
- [ ] Detectar si el inbound es tipo `interactive.button_reply` o `interactive.list_reply`.
- [ ] Mapear `id` del botón a intent interno.
- [ ] Construir respuesta con `type: interactive` en lugar de `type: text`.
- [ ] Decidir si el menú inicial usa siempre list o text según contexto.

---

## Fase 3 — Mensajes con imagen/media (FUTURO)

Para recordatorios visuales, imágenes de servicio, promociones:

```json
{
  "type": "image",
  "image": {
    "link": "https://cdn.example.com/recordatorio-cita.jpg",
    "caption": "📅 Recordatorio: mañana tienes cita a las 10:00 para *Corte y Barba*."
  }
}
```

O con document para enviar PDF de confirmación.

Limitaciones:
- La imagen debe ser URL pública HTTPS.
- El dominio debe estar whitelisteado en Meta.
- El caption acepta negritas y emojis igual que texto.
- No disponible en modo test sin aprobación adicional.

Pendiente:
- [ ] Definir CDN o storage para las imágenes.
- [ ] Diseñar imagen de recordatorio con marca del estudio.
- [ ] Evaluar si el tamaño de imagen cumple límites Meta (5 MB).

---

## Fase 4 — Templates aprobados (PRODUCCIÓN REAL)

Los templates son necesarios para:
- Iniciar conversación con el cliente (el cliente NO escribió primero).
- Enviar recordatorios automatizados fuera de ventana de 24 h.
- Mensajes de confirmación/aprobación si han pasado más de 24 h.

Ejemplo de template para recordatorio:

```
Nombre: appointment_reminder_v1
Idioma: es_MX
Categoría: UTILITY

Body:
Hola {{1}}, te recordamos tu cita para *{{2}}* mañana a las {{3}}.
Si necesitas cambiarla: {{4}}
```

Variables: nombre, servicio, hora, link mini app.

Limitaciones:
- Requiere aprobación de Meta (24–48 h).
- Solo disponible en WHATSAPP_MODE=production.
- El nombre del template debe coincidir exactamente con lo aprobado.
- No se puede usar HTML ni Markdown avanzado — solo variables `{{n}}` y formato básico.

Templates prioritarios para solicitar aprobación:
1. `appointment_confirmation` — confirmación de solicitud recibida.
2. `appointment_approved` — cita aprobada.
3. `appointment_reminder_24h` — recordatorio 24 h antes.
4. `appointment_cancelled` — cita cancelada.
5. `appointment_reschedule_required` — requiere reprogramación.

---

## Limitaciones generales de WhatsApp vs HTML

| Capacidad | HTML | WhatsApp |
|---|---|---|
| Colores | Sí | No |
| Fuentes personalizadas | Sí | No |
| Imágenes inline en texto | Sí | No (solo mensaje image separado) |
| Links con texto custom (`<a>`) | Sí | No (el link se muestra crudo pero se puede tocar) |
| Tablas | Sí | No |
| Listas ordenadas/HTML | Sí | Solo emojis de numeración manual |
| Botones fuera de ventana 24 h | Sí | No (requiere template aprobado) |
| Negritas | Sí | `*texto*` |
| Cursiva | Sí | `_texto_` |
| Saltos de línea | Sí | `\n` |
| Máx longitud texto | Variable | 4096 caracteres |

---

## Variables de entorno relevantes

| Variable | Uso |
|---|---|
| `MINIAPP_BASE_URL` | Base para construir links a mini apps |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número en Meta |
| `WHATSAPP_ACCESS_TOKEN` | Token de acceso Cloud API |
| `WHATSAPP_MODE` | `test` o `production` |
| `WHATSAPP_DRY_RUN` | `true` = no envía, `false` = envía real |
| `WHATSAPP_ALLOWED_TEST_PHONES` | Números permitidos en modo test |
| `EMERGENCY_CALL_PHONE` | Número directo para opción 5 |
| `BUSINESS_ADDRESS` | Dirección para respuestas de ubicación |

---

## Cómo probar los formatos mejorados

### Paso 1 — Verificar que el backend está en modo test activo

```bash
curl https://striking-caring-production.up.railway.app/api/owner/messages/diagnostics \
  -H "Authorization: Bearer dev-owner-secret"
```

Confirmar: `dryRun: false`, `mode: test`, `workerEnabled: true`.

### Paso 2 — Enviar mensajes de prueba desde el número autorizado

El número `+5216143278357` debe enviar al bot:

| Mensaje | Intent esperado | Respuesta esperada |
|---|---|---|
| `hola` | `greeting` | Menú completo 1–5 |
| `quiero una cita` | `booking` | Texto con link a mini app booking |
| `1` | `booking` | Texto con link a mini app booking |
| `cuánto cuesta` | `price` | Texto con link a servicios |
| `2` | `availability` | Texto con link a disponibilidad |
| `3` | `reschedule` | Texto con link a reprogramación (requiere cita activa) |
| `4` | `cancel` | Texto con link a cancelación (requiere cita activa) |
| `5` | `human_help` | Texto con número de emergencia |
| `qué horas` | `hours` | Texto con link a disponibilidad |
| `dónde están` | `location` | Texto con dirección |
| `texto libre extraño` | `unknown` | Mini menú sin links ni acciones peligrosas |

### Paso 3 — Verificar en outbound_messages

```sql
SELECT id, message_type, delivery_status, body, sent_at, failed_at
FROM booking.outbound_messages
ORDER BY created_at DESC
LIMIT 10;
```

Confirmar que `body` contiene el texto formateado (negritas, emojis, link CTA).

### Paso 4 — Verificar recepción en WhatsApp del cliente de prueba

El número `+5216143278357` debe recibir el mensaje en WhatsApp con el formato mejorado.
