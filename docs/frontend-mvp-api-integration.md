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

- Lee query params opcionales: `token`, `phone`, `fullName`.
- Prellena `phone` y `fullName` si vienen en URL.
- Carga servicios reales con `GET /api/public/services`.
- Carga disponibilidad real con `GET /api/public/availability?serviceId=<uuid>&weekStart=YYYY-MM-DD`.
- Permite completar nombre, celular, servicio, dia/horario y notas usando datos reales.
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

## 4) Ejemplos de links

Ejemplo local completo:

`http://localhost:8081/miniapp/booking?token=abc123&phone=%2B526141234567&fullName=Juan%20Perez`

Mini app con token:

`/miniapp/booking?token=abc123`

Mini app con token y telefono:

`/miniapp/booking?token=TOKEN&phone=%2B526141234567`

Mini app con token, telefono y nombre:

`/miniapp/booking?token=abc123&phone=%2B526141234567&fullName=Juan%20Perez`

Ejemplos futuros desde WhatsApp:

`https://tu-dominio.com/miniapp/booking?token=TOKEN_TEMPORAL`

`https://tu-dominio.com/miniapp/booking?token=TOKEN&phone=%2B526141234567`

## 5) Manejo de errores mini app

En mini app, el submit mapea estados comunes:

- `400`: datos invalidos
- `404`: servicio no encontrado
- `409`: horario no disponible
- `429`: demasiados intentos
- `500`: error inesperado

## 6) Notas de entorno local

- Web y iOS simulador suelen aceptar `http://localhost:3000`.
- En Android emulador, puede requerirse `http://10.0.2.2:3000`.
- Si falta `EXPO_PUBLIC_OWNER_SECRET`, solo impacta endpoints owner; mini app publica no lo requiere.

## 7) Fase MVP conectada

- `GET /api/public/services`
- `GET /api/public/availability?serviceId=<uuid>&weekStart=YYYY-MM-DD`
- `POST /api/public-booking/request`
- `GET /api/owner/appointments/pending`
- `GET /api/owner/appointments/today`
- `POST /api/owner/appointments/:id/approve`
- `POST /api/owner/appointments/:id/reject`
- `POST /api/owner/appointments/:id/cancel`
- `POST /api/owner/appointments/:id/complete`
