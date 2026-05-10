# Miniapp WhatsApp Flow QA

## Scope

Surface reviewed: public mini app opened from a WhatsApp link.

Entry route:

- `/miniapp/booking?token=<token>&phone=<phone>&fullName=<name>`
- Optional WhatsApp return target: `returnUrl=<whatsapp://...>` or `waReturnUrl=<whatsapp://...>`

Completion route:

- `/miniapp/success`

Additional WhatsApp menu routes:

- `/miniapp/reschedule?token=<token>&returnUrl=<optional>` for option 3.
- `/miniapp/cancel?token=<token>&returnUrl=<optional>` for option 4.

## Option/action map

| Option | Screen | Expected client action | Expected app action |
| --- | --- | --- | --- |
| 1 | Datos | Completes name, phone and appointment type | Validates required identity fields and moves to service selection |
| 2 | Servicio | Selects one real service or emergency call option | Stores selected service, clears stale slot selection and enables schedule step |
| 3 | Dia y horario | Selects day and one available slot | Loads real availability, filters slots by day and stores `slotStartAt` |
| 4 | Confirmar | Reviews summary and sends request | Posts `fullName`, `phone`, `serviceId`, `startAt`, optional `notes` and `token` |
| 5 | Exito | Reads confirmation and returns to WhatsApp | Shows pending approval state and exits back to WhatsApp |

## WhatsApp menu options

| WhatsApp option | Route / surface | Expected client action | Expected app action |
| --- | --- | --- | --- |
| 1 | `/miniapp/booking` | Request a new appointment | Uses public services, availability and booking request endpoint |
| 2 | `/miniapp/booking` | View availability and continue booking | Uses the same booking mini app with phone prefilled |
| 3 | `/miniapp/reschedule` | Select active appointment and new slot | Validates token, loads availability, posts public reschedule request |
| 4 | `/miniapp/cancel` | Select active appointment and explicitly confirm cancellation | Validates token, asks for confirmation, posts public cancellation |
| 5 | WhatsApp auto-reply / owner inbox | Read emergency-call instructions and call directly | No long mini app; message is marked as emergency call priority for owner |
 

## Interaction diagnosis

The issue reproduced by the manual test is a browser-history leak. The mini app was mounted as a public flow, but the physical phone back button/browser back gesture was not intercepted. When the user pressed back, the browser used whatever history existed before the WhatsApp link. That history could include `/`, `/(client)/*` or `/(owner)/dashboard`, so the client could land on screens outside the mini app.

Expected interaction model:

- The mini app is a temporary WhatsApp task, not a normal app session.
- In-app secondary actions can move between wizard steps.
- Phone/browser back means "exit mini app" and should return to WhatsApp.
- After success, the only expected next action is returning to WhatsApp.
- The public landing page must not advertise owner-only navigation.

## Fix applied

- Added a mini app exit guard for native hardware back and web browser back.
- Connected the guard in both `/miniapp/booking` and `/miniapp/success`.
- Standardized mini app exit through `whatsapp://` and `window.close()` where supported.
- Preserved an optional WhatsApp-only `returnUrl`/`waReturnUrl` through success so backend-generated links can return to a specific WhatsApp target when available.
- Removed the visible `Panel del estudio` button from the public landing page.
- Added option 3 reschedule mini app backed by `GET /api/public/miniapp-tokens/:token` and `POST /api/public/appointments/reschedule-request`.
- Added option 4 cancellation mini app backed by `GET /api/public/miniapp-tokens/:token` and `POST /api/public/appointments/cancel`.
- Updated owner inbound messages to display option 5 emergency calls as `Cita de emergencia` priority instead of generic human help.

## Manual regression checklist

- Open the WhatsApp link to `/miniapp/booking`.
- Press the phone back button on option 1: user should be sent back to WhatsApp.
- Reopen and advance to option 2, then press phone back: user should be sent back to WhatsApp, not `/`.
- Reopen and advance to option 3, then press phone back: user should be sent back to WhatsApp, not client or owner routes.
- Reopen and advance to option 4, then press phone back: user should be sent back to WhatsApp.
- Complete the request and reach option 5 success: tapping `Volver al chat de WhatsApp` should return to WhatsApp.
- From option 5, phone back should also return to WhatsApp.
- Confirm the public landing page no longer shows `Panel del estudio`.
- Open an option 3 link with `purpose=reschedule`: token validates, appointment is shown, new slot can be submitted, and success returns to WhatsApp.
- Open an option 4 link with `purpose=cancel`: token validates, cancellation is blocked until explicit confirmation, and success returns to WhatsApp.
- Send a simulated option 5 inbound message: owner inbox should show `Cita de emergencia` / priority language, not a generic help label.

## Residual risk

This is a frontend navigation fix, not a complete security boundary. Owner routes still need real authentication before production so a manually typed owner URL cannot expose private tools.
