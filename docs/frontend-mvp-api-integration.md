# Frontend MVP API Integration

Configuracion minima para conectar la app Expo con backend MVP local, separando flujo de app principal y mini app publica.

## 1) Variables de entorno

Crea un archivo `.env` en la raiz del proyecto tomando como base `.env.example`.

Variables activas:

- `EXPO_PUBLIC_API_BASE_URL`: URL base del backend (ejemplo local: `http://localhost:3000`).
- `EXPO_PUBLIC_OWNER_SECRET`: token owner para endpoints privados.

Variables legacy (deprecated, no requeridas por flujo nuevo):

- `EXPO_PUBLIC_BOOKING_CLIENT_FULL_NAME`
- `EXPO_PUBLIC_BOOKING_CLIENT_PHONE`

## 2) Reiniciar Metro

Despues de cambiar variables de entorno, reinicia Expo:

```bash
npm run start
```

## 3) Flujos soportados

### 3.1 App principal cliente

- Mantiene flujo actual de booking.
- Sigue siendo independiente del flujo owner.
- No depende de variables temporales de identidad por entorno como solucion base.

### 3.2 Mini app publica (entrada desde WhatsApp)

Rutas nuevas:

- `/miniapp/booking`
- `/miniapp/success`

La mini app:

- Lee query params opcionales: `token`, `phone`, `fullName`, `returnTo`, `intent`.
- Prellena `phone` y `fullName` si vienen en URL (el campo sigue siendo editable).
- Adapta título y helper según `intent` (ver §4).
- Usa una experiencia guiada de 4 pasos: datos, servicio, dia/horario, confirmar.
- Carga servicios reales con `GET /api/public/services`.
- Carga disponibilidad real con `GET /api/public/availability?serviceId=<uuid>&weekStart=YYYY-MM-DD`.
- Muestra los proximos 7 dias sin calendario complejo.
- Filtra los slots del dia elegido usando `slotStartAt` del backend.
- Permite completar nombre, celular, servicio, dia/horario usando datos reales.
- Envia solicitud a `POST /api/public-booking/request` con:
	- `fullName`
	- `phone`
	- `serviceId`
	- `startAt` (usa `slotStartAt` devuelto por backend como fuente de verdad)
	- `notes` opcional
	- `token` opcional

En mini app no hay fallback mock silencioso cuando falla backend:

- Se muestra error visible al usuario.
- Se bloquea envio hasta resolver datos requeridos.
- Muestra progreso visible `1 / 4`, `2 / 4`, `3 / 4`, `4 / 4`.
- Usa botones grandes y una sola accion principal por paso.

#### Flujo visual de pasos

1. **Tus datos**
	- Logo del negocio.
	- Titulo visible: depende de `intent` (ver §4).
	- Subtitulo/helper: depende de `intent`.
	- Campos: `Nombre completo`, `Celular`.
	- Si el link trae `phone` o `fullName`, se prellenan (editables).
	- Accion principal: `Continuar`.
2. **Servicio**
	- Titulo: `Elige un servicio`.
	- Lista tarjetas grandes con servicios reales.
	- Muestra nombre, duracion y descripcion cuando existe.
	- Servicio seleccionado con color destacado.
	- Accion principal: `Continuar`.
3. **Dia y horario**
	- Titulo: `Elige dia y horario`.
	- Muestra los proximos 7 dias.
	- Al elegir dia, consulta disponibilidad real de la semana correspondiente.
	- Muestra slots reales de ese dia.
	- Si no hay slots: `No hay horarios disponibles este dia.`
	- Accion principal: `Continuar`.
4. **Confirmar**
	- Titulo: `Confirma tu cita`.
	- Muestra resumen visual: nombre, celular, servicio, dia y hora.
	- Permite agregar notas opcionales.
	- Accion principal: `Enviar solicitud`.
5. **Exito**
	- Redirige a `/miniapp/success`.
	- Muestra:
		- `Solicitud enviada`
		- `Tu cita queda pendiente de aprobacion`
		- `Te avisaremos por WhatsApp cuando sea aprobada`
		- Boton `Volver al chat de WhatsApp` si `returnTo=whatsapp`; de lo contrario `Finalizar`.
		- Texto de ayuda (aparece 2.5 s despues): `Si WhatsApp no se abre automaticamente, vuelve manualmente al chat.`

## 4) Intent y parámetros WhatsApp CTA

El backend WhatsApp envía links con `intent` y `returnTo` para contextualizar la mini app.

### Parámetros soportados por `/miniapp/booking`

| Parámetro | Valores | Efecto |
|---|---|---|
| `intent` | `booking` (default) | Título: "Agenda tu cita", helper: "Es rápido y fácil" |
| `intent` | `availability` | Título: "Horarios disponibles", helper: "Elige un servicio para ver horarios" |
| `intent` | `reschedule` | Título: "Reprogramar cita", helper: "Elige un nuevo horario disponible" |
| `returnTo` | `whatsapp` | En success: botón "Volver al chat de WhatsApp"; se reenvía a success |
| `returnUrl` | URL wa.me o whatsapp:// | Deep-link explícito de vuelta a WhatsApp; prioridad sobre phone |
| `phone` | E.164 url-encoded (`%2B52...`) | Prellena el campo celular (editable); se reenvía a success para construir wa.me link |
| `fullName` | url-encoded | Prellena el campo nombre (editable) |
| `token` | uuid | Token de un solo uso para flujos con cita activa |

### Parámetros soportados por `/miniapp/success`

El componente success recibe estos parámetros (enviados automáticamente por booking tras completar la solicitud):

| Parámetro | Origen | Uso |
|---|---|---|
| `appointmentId` | Backend response | Muestra folio de la solicitud |
| `phone` | Reenviado desde booking | Construye `https://wa.me/{digits}` para el botón |
| `returnTo` | Reenviado desde booking | `whatsapp` → botón "Volver al chat de WhatsApp" |
| `returnUrl` | Reenviado desde booking | Deep-link explícito; prioridad sobre phone para construir la URL |

### Ejemplos de links desde WhatsApp CTA

**intent=booking** (menú opción 1 — agendar):

```
/miniapp/booking?phone=%2B526141234567&returnTo=whatsapp&intent=booking
```

**intent=availability** (menú opción 2 — ver horarios):

```
/miniapp/booking?phone=%2B526141234567&returnTo=whatsapp&intent=availability
```

**intent=reschedule** (menú opción 3 — reprogramar):

```
/miniapp/booking?phone=%2B526141234567&returnTo=whatsapp&intent=reschedule
```

### URLs de prueba local (puerto 8081)

```
http://localhost:8081/miniapp/booking?phone=%2B526141234567&returnTo=whatsapp&intent=booking
http://localhost:8081/miniapp/booking?phone=%2B526141234567&returnTo=whatsapp&intent=availability
http://localhost:8081/miniapp/booking?phone=%2B526141234567&returnTo=whatsapp&intent=reschedule
```

### Limitación actual de reschedule

El flujo `intent=reschedule` **crea una nueva solicitud de booking** — no modifica una cita existente.

Pendiente para fase futura:
- Recibir `token` o `appointmentId` seguro por URL que identifique la cita a reprogramar.
- Llamar a `PUT /api/public/appointments/reschedule-request` en lugar de `POST /api/public-booking/request`.
- El backend debe generar un token de un solo uso válido por 24 h para el link.
- El TODO está marcado en código en `booking.tsx` step `schedule`.

### Comportamiento del botón "Volver al chat de WhatsApp" en success

El botón llama a `returnToWhatsApp(target)` del hook `useMiniAppExitGuard`.
La función `buildWhatsAppTarget()` determina el target con esta prioridad:

1. **`returnUrl` / `waReturnUrl`** — deep-link explícito enviado por el backend (ej. `https://wa.me/526141234567`).
2. **`phone`** — se normaliza a solo dígitos y se construye `https://wa.me/{digits}`.
3. **(ninguno)** — abre `whatsapp://` genérico (abre WhatsApp sin chat específico).

En web (Chrome Custom Tab desde WhatsApp), `returnToWhatsApp` usa `openViaAnchor()` — crea un `<a>` oculto y simula click — lo que activa el intent del sistema sin llamar `window.open()` (que Chrome Custom Tab bloquea).

Si el usuario sigue en la página 2.5 s después de presionar el botón, aparece el texto de ayuda:
> *Si WhatsApp no se abre automáticamente, vuelve manualmente al chat.*

### Limitaciones conocidas

- **No se puede volver al chat exacto**: WhatsApp no expone una URL que abra directamente un hilo de conversación específico desde un navegador externo. `wa.me/{phone}` abre una nueva conversación o el chat existente según el dispositivo.
- **Chrome Custom Tab no permite `window.open()`**: Por eso se usa la técnica de anchor click. `Linking.openURL()` de React Native Web falla silenciosamente en este contexto.
- **iOS Safari / navegadores de escritorio**: `whatsapp://` requiere que WhatsApp esté instalado. Si no lo está, el navegador puede mostrar un error de URL no reconocida — el hint de texto aparece para este caso.
- **Deep-link con chat exacto**: Solo es posible si el backend genera un `returnUrl` apuntando a `https://wa.me/{phone}` con el número correcto, lo que el bot ya hace cuando envía el link de la mini app.

## 6) Ejemplos de links

Ejemplo local completo:

`http://localhost:8081/miniapp/booking?token=abc123&phone=%2B526141234567&fullName=Juan%20Perez`

Ejemplo esperado desde WhatsApp:

`/miniapp/booking?phone=%2B526141234567&fullName=Ana`

Mini app con token:

`/miniapp/booking?token=abc123`

Mini app con token y telefono:

`/miniapp/booking?token=TOKEN&phone=%2B526141234567`

Mini app con token, telefono y nombre:

`/miniapp/booking?token=abc123&phone=%2B526141234567&fullName=Juan%20Perez`

Ejemplos futuros desde WhatsApp:

`https://barberjaquelinalopezstudio.netlify.app/miniapp/booking?phone=%2B526141234567&fullName=Ana`

`https://barberjaquelinalopezstudio.netlify.app/miniapp/booking?token=TOKEN&phone=%2B526141234567`

## 7) Manejo de errores mini app

En mini app, el submit mapea estados comunes:

- `400`: `Revisa tus datos`
- `404`: `El servicio ya no esta disponible`
- `409`: `Ese horario ya fue ocupado. Elige otro`
- `429`: `Demasiados intentos. Intenta mas tarde`
- `500`: `Ocurrio un error. Intenta mas tarde`

Tambien se muestra error visible cuando falla la carga de servicios o disponibilidad.

## 8) Timezone y slots

- El frontend no construye horarios manualmente.
- El frontend usa `slotStartAt` devuelto por `GET /api/public/availability` como valor de `startAt`.
- Para mostrar hora al usuario se formatea con locale `es-MX` y zona `America/Mexico_City`.
- No se debe mostrar `requestedStartAt` como hora visible porque incluye buffers del servicio.

## 9) Notas de entorno local

- Web y iOS simulador suelen aceptar `http://localhost:3000`.
- En Android emulador, puede requerirse `http://10.0.2.2:3000`.
- Si falta `EXPO_PUBLIC_OWNER_SECRET`, solo impacta endpoints owner; mini app publica no lo requiere.
- Para probar la mini app en web, usar un puerto permitido por CORS de Railway, por ejemplo `8081`, `8082`, `3000` o `19006`.

Ejemplo de prueba local:

```bash
npx expo start --web --port 8081
```

URL local:

`http://localhost:8081/miniapp/booking?phone=%2B526141234567&fullName=Ana`

## 10) Fase MVP conectada

- `GET /api/public/services`
- `GET /api/public/availability?serviceId=<uuid>&weekStart=YYYY-MM-DD`
- `POST /api/public-booking/request`
- `GET /api/owner/appointments/pending`
- `GET /api/owner/appointments/today`
- `POST /api/owner/appointments/:id/approve`
- `POST /api/owner/appointments/:id/reject`
- `POST /api/owner/appointments/:id/cancel`
- `POST /api/owner/appointments/:id/complete`
