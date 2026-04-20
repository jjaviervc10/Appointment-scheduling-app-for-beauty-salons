# 📋 Reporte Completo de la Aplicación
## Jaquelina López Barber Studio — App de Reservas

> **Fecha:** 19 de Abril de 2026  
> **Tecnología:** React Native + Expo SDK 54 + TypeScript  
> **Backend:** Supabase (actualmente con datos simulados/mock)  
> **Diseño:** Tema oscuro premium (negro + dorado)

---

## 🏗️ ARQUITECTURA GENERAL

La aplicación tiene **dos roles de usuario** que comparten la misma app pero ven pantallas completamente diferentes:

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Cliente** | Persona que quiere reservar una cita | Botón "Reservar ahora" en la pantalla de inicio |
| **Dueña (Owner)** | Jaquelina López, quien administra el negocio | Botón "Panel del estudio" en la pantalla de inicio |

La app es **responsiva**: en pantallas grandes (≥768px) muestra un menú lateral (sidebar), en móviles muestra pestañas inferiores (tabs).

---

## 🎨 DISEÑO VISUAL

Toda la app usa un tema oscuro premium con los siguientes colores:

| Elemento | Color | Código |
|----------|-------|--------|
| Fondo principal | Negro | `#1A1A1A` |
| Tarjetas | Gris oscuro | `#212121` |
| Bordes | Gris medio | `#424242` |
| Acentos / Botones principales | Dorado | `#C8A84E` |
| Texto principal | Blanco | `#FFFFFF` |
| Texto secundario | Gris claro | `#9E9E9E` |

---

## 📱 PANTALLA DE INICIO (Landing Page)

**Lo que ve el usuario al abrir la app:**

```
┌─────────────────────────────────────┐
│        [Logo animado del estudio]    │
│                                      │
│   "Bienvenida a tu mejor versión"    │
│                                      │
│  ┌──────────┬──────────┬──────────┐  │
│  │ Reserva  │ Atención │   Sin    │  │
│  │  fácil   │ privada  │ esperas  │  │
│  └──────────┴──────────┴──────────┘  │
│                                      │
│  ┌──────────────────────────────────┐│
│  │   🗓️  Reservar ahora            ││  ← Va a pantalla del CLIENTE
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │   📅  Ver disponibilidad        ││  ← Va directo a reservar
│  └──────────────────────────────────┘│
│                                      │
│      "Panel del estudio" (enlace)    │  ← Va a pantalla de la DUEÑA
│                                      │
│  🛡️ Tu cita está 100% segura        │
│     Confirmación por WhatsApp        │
└─────────────────────────────────────┘
```

---

# 👩 LADO DEL CLIENTE

## Navegación del Cliente (4 pestañas)

```
┌──────────┬──────────┬──────────┬──────────┐
│  🏠      │  📅      │  📋      │  🚪      │
│ Inicio   │ Reservar │ Mis citas│  Salir   │
└──────────┴──────────┴──────────┴──────────┘
```

---

### 🏠 Pantalla 1: INICIO (Home)

**Propósito:** Página principal del cliente con información del estudio, promociones y servicios.

**Secciones de arriba hacia abajo:**

#### a) Encabezado oscuro
- Logo del estudio
- "Bienvenida a Jaquelina López"
- Badge: "BARBER STUDIO"

#### b) Slider de promociones (se puede ocultar con un switch)
Las promociones se deslizan automáticamente cada 4 segundos:

| # | Promoción | Detalle |
|---|-----------|---------|
| 1 | "¡Nuevo look para este mes!" | Descuentos en cortes y peinados |
| 2 | "Martes de barbería" | 20% de descuento en corte de barba |
| 3 | "Paquete completo" | Corte + barba + tinte desde $500 |

#### c) Botón principal
> **"Reservar cita"** → Lleva a la pantalla de reservas

#### d) Lista de servicios

| Servicio | Duración | Precio |
|----------|----------|--------|
| Corte de cabello | 45 min | $250 |
| Peinado especial | 60 min | $400 |
| Tinte para barba | 30 min | $200 |
| Corte de barba | 30 min | $150 |

#### e) Sección de emergencia
> "¿Cita de emergencia?"
> 
> Si el cliente tiene una urgencia real, puede ver los descansos disponibles de Jaquelina y llamarla directamente.

**Al tocar la sección de emergencia se abre un modal:**
- Mensaje: "Este espacio es para verdaderas emergencias. Estos son mis descansos personales..."
- Muestra los próximos 3 descansos (día, hora, tipo)
- Botón verde: **"Llamar ahora"** (abre la app de teléfono)
- Nota: "Solo llamadas directas · No se agenda por la app"

---

### 📅 Pantalla 2: RESERVAR (Booking)

**Propósito:** El cliente busca disponibilidad y selecciona un horario para su cita.

Tiene **3 modos de vista** que se cambian con botones de filtro:

#### Vista MES 📆

```
┌─────────────────────────────────────┐
│       ◁  Abril 2026  ▷              │
│                                      │
│  L    M    X    J    V    S    D     │
│            1    2    3    4    5     │
│  6    7    8    9●  10   11   12     │
│  13   14   15   16   17   18  19    │
│  ...                                 │
│                                      │
│  ● Verde = 4+ libres                │
│  ● Naranja = 1-3 libres             │
│  ● Rojo = Lleno                      │
└─────────────────────────────────────┘
```

- Cada día muestra un punto de color indicando disponibilidad
- Al tocar un día → cambia a la Vista Día para ver los horarios detallados

#### Vista SEMANA 📋 (estilo acordeón)

```
┌─────────────────────────────────────┐
│    ◁  14 – 20 de Abril 2026  ▷      │
│                                      │
│  Lun 14  ████████░░  [4 libres]  ▼  │
│  Mar 15  ██████████  [Lleno]     ▶  │
│  Mié 16  ██████░░░░  [6 libres]  ▼  │
│    ┌─ Mañana ☀️ ─────────────┐       │
│    │ 09:00  10:00  11:00     │       │
│    └─ Tarde 🌙 ──────────────┘       │
│    │ 14:00  15:00  16:00     │       │
│  Jue 17  ████░░░░░░  [8 libres]  ▶  │
│  ...                                 │
└─────────────────────────────────────┘
```

- Cada día se puede expandir tocándolo
- Al expandir muestra los horarios disponibles en cuadrícula (mañana / tarde)
- Al tocar un horario → se abre el **Wizard de reserva**

#### Vista DÍA 🕐

```
┌─────────────────────────────────────┐
│       ◁  Miércoles 16  ▷            │
│          Abril 2026                  │
│                                      │
│   [4 libres]  [3 ocupados]          │
│                                      │
│  09:00  ✅ Disponible                │
│  09:45  ✅ Disponible                │
│  10:30  🔒 Ocupado                   │
│  11:15  ✅ Disponible                │
│  12:00  🔒 Ocupado (bloqueo: comida)│
│  12:45  ✅ Disponible                │
│  ...                                 │
└─────────────────────────────────────┘
```

- Horarios de trabajo: 9:00 AM a 6:00 PM
- Ranuras de 45 minutos
- Los horarios verdes se pueden tocar → se abre el **Wizard de reserva**
- Los horarios ocupados aparecen atenuados y no se pueden seleccionar

---

### 🧙 Modal: WIZARD DE RESERVA (BookingWizardModal)

Se abre cuando el cliente toca un horario disponible. Tiene **2 pasos:**

#### Paso 1 — Seleccionar servicio

```
┌─────────────────────────────────────┐
│  📅 Miércoles 16 Abril · 09:00–09:45│
│                                      │
│  Tipo de cita:                       │
│  [Individual]  [Familiar]            │
│                                      │
│  Si elige "Familiar":                │
│  ¿Quién asiste? [Papá e hijo(s)]    │
│                 [Solo hijo(s)]       │
│  Cantidad de hijos: [- 1 +]         │
│                                      │
│  Selecciona servicio:                │
│  ○ Corte de cabello    $250         │
│  ● Peinado especial    $400  ✓      │
│  ○ Tinte para barba    $200         │
│  ○ Corte de barba      $150         │
│                                      │
│         [Continuar →]                │
└─────────────────────────────────────┘
```

#### Paso 2 — Confirmar

```
┌─────────────────────────────────────┐
│  Resumen de tu cita:                 │
│                                      │
│  ✂️  Peinado especial                │
│  📅  Miércoles 16 de Abril          │
│  🕐  09:00 – 10:00                  │
│  💰  $400                            │
│  👤  Individual                      │
│                                      │
│      [← Atrás]  [Solicitar cita]    │
└─────────────────────────────────────┘
```

> Al confirmar aparece un aviso:
> **"Solicitud enviada — Tu cita queda pendiente hasta que Jaquelina la apruebe"**

---

### 📋 Pantalla 3: MIS CITAS (My Appointments)

**Propósito:** El cliente ve el estado de todas sus citas.

```
┌─────────────────────────────────────┐
│  📋 Mis citas                        │
│     Seguimiento y estado             │
│                                      │
│  — Próxima cita —                    │
│  ┌─ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ─┐ │
│  │ ▍ 10:00 - 10:45   [Confirmada] │ │
│  │ ▍ Corte de cabello              │ │
│  │ ▍ 45 min                        │ │
│  └─────────────────────────────────┘ │
│                                      │
│  — Anteriores / Próximas —           │
│  ┌─────────────────────────────────┐ │
│  │  14:00 - 15:00   [Pendiente]   │ │
│  │  Peinado especial               │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │  09:00 - 09:30   [Completada]  │ │
│  │  Corte de barba                 │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Estados posibles de una cita:**

| Estado | Color | Significado |
|--------|-------|-------------|
| Pendiente | 🟠 Naranja | Esperando aprobación de Jaquelina |
| Confirmada | 🟢 Verde | Jaquelina aprobó la cita |
| Esperando confirmación | 🟠 Naranja oscuro | Jaquelina respondió, falta que el cliente confirme |
| Cancelada | 🔴 Rojo | El cliente o Jaquelina canceló |
| Reprogramar | 🔵 Azul | Se necesita cambiar la fecha/hora |
| Completada | ⚫ Gris azulado | La cita ya pasó exitosamente |
| No asistió | 🟣 Morado | El cliente no se presentó |

---

### 🚪 Pestaña 4: SALIR

Regresa a la pantalla de inicio (landing page).

---

# 👑 LADO DE LA DUEÑA (OWNER)

## Navegación de la Dueña

**En computadora (sidebar lateral):**
```
┌────────────┬───────────────────────┐
│ 🟡 JL     │                       │
│   Studio   │                       │
│            │   Contenido de la     │
│ ● Inicio  │   pantalla activa     │
│ ○ Agenda   │                       │
│ ○ Clientes │                       │
│ ○ Mensajes │                       │
│ ○ Ajustes  │                       │
│            │                       │
│ ─────────  │                       │
│ 🔴 Salir  │                       │
└────────────┴───────────────────────┘
```

**En celular (pestañas inferiores):**
```
┌──────┬───────┬────────┬────────┬───────┬──────┐
│Inicio│Agenda │Clientes│Mensajes│Ajustes│Salir │
└──────┴───────┴────────┴────────┴───────┴──────┘
```

---

### 🏠 Pantalla 1: DASHBOARD (Panel de control)

**Propósito:** Vista general del día con métricas, acciones rápidas, solicitudes pendientes y línea de tiempo.

#### a) Encabezado
- "Centro de operación"
- Fecha del día en dorado
- Botón "Nueva cita"

#### b) 4 Tarjetas de métricas (KPIs)

```
┌───────────────┬──────────────┐
│ 📅 Citas hoy  │ ⏳ Pendientes │
│     12        │      3       │
├───────────────┼──────────────┤
│ ✅ Confirmadas │ 📊 Ocupación │
│      8        │    75%       │
└───────────────┴──────────────┘
```

> Al tocar cualquier tarjeta se abre un **modal con el detalle** (lista de citas o gráfico de ocupación)

#### c) 4 Botones de acción rápida

| Botón | Acción |
|-------|--------|
| ➕ Nueva cita | Abre modal para crear cita manualmente |
| 🔒 Bloquear | Abre modal para bloquear un horario |
| 🔍 Buscar | Va a la pantalla de Clientes |
| 💬 Mensaje | Va a la pantalla de Mensajes |

#### d) Panel de solicitudes pendientes

Muestra las citas que los clientes pidieron y están esperando aprobación:

```
┌─────────────────────────────────────┐
│  🟠 3 Solicitudes pendientes        │
│                                      │
│  ┌─ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ─┐ │
│  │ ▍ AL │ Ana López               │ │
│  │ ▍    │ Corte de cabello · 45min│ │
│  │ ▍    │ Hoy · 10:00 AM         │ │
│  │ ▍                              │ │
│  │ [Aceptar] [Reprogramar] [Cancelar] │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- **Aceptar:** Confirma la cita (se envía WhatsApp automático)
- **Reprogramar:** Abre el modal de reprogramación
- **Cancelar:** Rechaza la cita

#### e) Línea de tiempo del día

```
┌─────────────────────────────────────┐
│  08:00 ─────────────────────────     │
│  09:00 ┌──────────────────┐          │
│        │ Ana López        │          │
│        │ Corte · 45min    │          │
│  10:00 └──────────────────┘          │
│        ┌──────────────────┐          │
│        │ 🔒 Comida        │ (gris)   │
│  11:00 └──────────────────┘          │
│  ─ ─ ─ 🔴 AHORA (10:30) ─ ─ ─ ─    │
│  12:00 ┌──────────────────┐          │
│        │ Carlos Méndez    │          │
│        │ Peinado · 60min  │          │
│  13:00 └──────────────────┘          │
│  ...                                 │
└─────────────────────────────────────┘
```

- Las citas se muestran con colores según su estado
- Los bloqueos de tiempo aparecen en gris con icono de candado
- La línea roja marca la hora actual

#### f) Botón flotante (FAB) — esquina inferior derecha

```
        ⚠️ Incidencia
        🔒 Bloquear horario
        📅 Nueva cita
        [+]  ← botón dorado
```

---

### 📅 Pantalla 2: AGENDA

**Propósito:** Gestión completa del calendario con 5 sub-pestañas.

```
┌─────┬────────┬─────┬──────────────┬─────────┐
│ Día │ Semana │ Mes │Disponibilidad│Bloqueos │
└─────┴────────┴─────┴──────────────┴─────────┘
```

#### Sub-pestaña: DÍA 📋

Vista hora por hora del día seleccionado (8:00 AM - 8:00 PM):

```
┌─────────────────────────────────────┐
│      ◁  Sábado, 19 de Abril  ▷     │
│              [Hoy]                   │
│                                      │
│  12 citas · 8 confirmadas ·         │
│  3 pendientes · 2 bloqueos          │
│                                      │
│  08:00 ─────────────────────         │
│  09:00 ┌──────── ✅ ───────┐         │
│        │ Ana López          │         │
│        │ Corte · 09:00-09:45│         │
│  10:00 └────────────────────┘         │
│  ...                                 │
└─────────────────────────────────────┘
```

> **Al tocar una cita** se abre un modal de acciones rápidas:

```
┌─────────────────────────────────────┐
│  Ana López                           │
│  Corte de cabello · 45 min          │
│  09:00 – 09:45        [Pendiente]   │
│                                      │
│  ┌─────┬─────┬─────┬─────┬─────┐   │
│  │  ✅  │  📅 │  🚫 │  💬 │  📋 │   │
│  │Confir│Repro│Cance│Whats│Detal│   │
│  │ mar  │gramar│ lar │ App │ le  │   │
│  └─────┴─────┴─────┴─────┴─────┘   │
│                                      │
│           [Cerrar]                   │
└─────────────────────────────────────┘
```

#### Sub-pestaña: SEMANA 📊

Vista de 7 columnas (Lunes a Domingo) con franjas horarias:

```
┌──────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│      │ Lun │ Mar │ Mié │ Jue │ Vie │ Sáb │ Dom │
│      │ 14  │ 15  │ 16  │ 17  │ 18  │ 19* │ 20  │
├──────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│08:00 │     │ 🔒  │     │     │     │     │     │
│09:00 │ Ana │     │ ██  │     │ ██  │ Ana │     │
│10:00 │     │ Car │     │ Luc │     │     │     │
│...   │     │     │     │     │     │     │     │
└──────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

#### Sub-pestaña: MES 📆

Calendario mensual con indicadores de carga:

- Cada celda muestra: número del día, mini-indicadores de citas, barra de ocupación
- Colores de fondo: verde (pocas citas), dorado (moderado), naranja (muchas)
- Al tocar un día → se abre un modal con la lista de citas de ese día

#### Sub-pestaña: DISPONIBILIDAD ⏰

Configuración de horarios laborales para cada día de la semana:

```
┌─────────────────────────────────────┐
│  Horarios laborales                  │
│  Configura tu disponibilidad semanal │
│                                      │
│  [L][M][X][J][V][S][D]  ← preview  │
│  9-6 9-6 9-6 9-6 9-6 9-2 --        │
│                                      │
│  ┌─ ● Lunes ──────────── 9:00-18:00┐│
│  │  Desde: [09] : [00] [AM/PM]     ││
│  │  Hasta: [06] : [00] [AM/PM]     ││
│  │  📋 Copiar a todos               ││
│  └──────────────────────────────────┘│
│  ┌─ ● Martes ─────────── 9:00-18:00┐│
│  └──────────────────────────────────┘│
│  ┌─ ○ Domingo ────────── Cerrado   ┐│
│  └──────────────────────────────────┘│
│                                      │
│       [💾 Guardar configuración]     │
└─────────────────────────────────────┘
```

- Cada día se puede activar/desactivar con un toggle circular
- Se expande para editar hora de inicio y fin
- Botón "Copiar a todos" permite replicar el horario a los demás días

#### Sub-pestaña: BLOQUEOS 🔒

Gestión de bloqueos de tiempo e incidencias:

```
┌─────────────────────────────────────┐
│  Bloqueos e incidencias              │
│              [+ Bloqueo] [⚠️]       │
│                                      │
│  — Incidencias activas —             │
│  ┌─ ⛔ ─────────────────────────── ┐│
│  │ [ALTA] · 22 Abril               ││
│  │ Emergencia familiar              ││
│  │ No podré asistir al estudio     ││
│  │ 09:00 – 18:00                   ││
│  │ ⚠️ 3 citas afectadas            ││
│  │ [Notificar] [Reprogramar] [✓]   ││
│  └──────────────────────────────────┘│
│                                      │
│  — Bloqueos de tiempo —              │
│  ┌──────────────────────────────────┐│
│  │ 🍴 Comida                        ││
│  │ 19 Abr · 12:00–13:00 · Diario  ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ 🏫 Recoger niños                 ││
│  │ 19 Abr · 14:00–15:00 · L-V     ││
│  └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Tipos de bloqueo disponibles:**

| Tipo | Icono | Color |
|------|-------|-------|
| Comida | 🍴 | Naranja |
| Escuela hijos | 🏫 | Azul |
| Descanso | 🛏️ | Verde |
| Mandado | 🚗 | Morado |
| Otro | ⋯ | Gris |

---

### 👥 Pantalla 3: CLIENTES

**Propósito:** Directorio de clientes con búsqueda.

```
┌─────────────────────────────────────┐
│  👥 Clientes                         │
│     8 clientes registrados           │
│                                      │
│  🔍 [Buscar cliente...]             │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ (AL) Ana López                   ││
│  │      +52 55 1234 5678            ││
│  │      12 citas · Última: 2026-04 ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ (CM) Carlos Méndez              ││
│  │      +52 55 8765 4321            ││
│  │      8 citas · Última: 2026-04  ││
│  └──────────────────────────────────┘│
│  ...                                 │
└─────────────────────────────────────┘
```

- Se puede buscar por nombre o teléfono
- Cada tarjeta muestra: iniciales en avatar dorado, nombre, teléfono, cantidad de citas y última visita

**8 clientes en el sistema:**
Ana López, Carlos Méndez, Lucía Ramírez, Martha Ruiz, María García, Roberto Sánchez, Diana Torres, Fernando Ruiz

---

### 💬 Pantalla 4: MENSAJES

**Propósito:** Registro de notificaciones de WhatsApp enviadas automáticamente.

```
┌─────────────────────────────────────┐
│  💬 Mensajes                         │
│     Estado de notificaciones         │
│                                      │
│  ┌────────┬────────┬────────┐       │
│  │ Total  │ Leídos │Fallidos│       │
│  │   4    │   1    │   1   │       │
│  └────────┴────────┴────────┘       │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ 💬 Ana López    [✓✓ Leído]      ││
│  │ CONFIRMACIÓN DE CITA            ││
│  │ "Tu cita del 19/04 a las 10:00 ││
│  │  ha sido confirmada..."          ││
│  │ Hace 2 horas                     ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ 💬 Carlos M.    [✗ Fallido]     ││
│  │ RECORDATORIO                     ││
│  │ "Recordatorio: tienes cita      ││
│  │  mañana a las 14:00..."          ││
│  │ Hace 5 horas                     ││
│  └──────────────────────────────────┘│
│                                      │
│  ℹ️ Los mensajes se envían           │
│  automáticamente por WhatsApp        │
└─────────────────────────────────────┘
```

**Tipos de mensaje:** Confirmación de cita, Recordatorio, Reprogramación  
**Estados:** Enviado (✓), Entregado (✓✓), Leído (✓✓ azul), Fallido (✗ rojo)

Se pueden filtrar tocando las tarjetas de resumen (Total / Leídos / Fallidos).

---

### ⚙️ Pantalla 5: CONFIGURACIÓN

**Propósito:** Ajustes del negocio.

```
┌─────────────────────────────────────┐
│  ⚙️ Configuración                    │
│     Ajustes del negocio              │
│                                      │
│  — Información del negocio —         │
│  Nombre: [Jaquelina López Barber... ]│
│  Zona horaria: America/Mexico_City   │
│                                      │
│  — Configuración de citas —          │
│  Duración predeterminada: [45] min   │
│  Buffer entre citas: [15] min        │
│  Días máx. anticipación: [30]        │
│                                      │
│  — Notificaciones —                  │
│  Confirmación automática  [Activo ✓] │
│  Recordatorio 24h antes   [Activo ✓] │
│                                      │
│       [💾 Guardar cambios]           │
│                                      │
│  ℹ️ Los cambios se aplican           │
│  inmediatamente                      │
└─────────────────────────────────────┘
```

---

## 📝 MODALES DE LA DUEÑA

### Modal: NUEVA CITA (NewAppointmentModal)

La dueña puede crear citas manualmente en **3 pasos:**

```
Paso 1: Seleccionar cliente
  → Lista de clientes con avatar, nombre, teléfono y # de visitas

Paso 2: Seleccionar servicio
  → Lista de servicios con duración y precio

Paso 3: Elegir horario
  → Resumen del cliente y servicio seleccionados
  → Entrada manual de hora (HH:MM + AM/PM)
  → Campo de notas opcional
  → Botón "Crear cita"
```

### Modal: BLOQUEAR HORARIO (BlockTimeModal)

```
  → Seleccionar tipo (comida/escuela/descanso/mandado/otro)
  → Hora inicio y fin (HH:MM + AM/PM)
  → Etiqueta (nombre del bloqueo)
  → Notas opcionales
  → Toggle: ¿Es recurrente?
  → Botón "Crear bloqueo"
```

### Modal: INCIDENCIA (IncidentModal)

Para reportar problemas que afectan las citas:

```
  → Severidad: Baja / Media / Alta / Emergencia
  → Razones rápidas: Falla de luz, Problema de agua,
    Equipo descompuesto, Emergencia personal, etc.
  → Descripción detallada
  → Vista previa del impacto:
    "Se cancelarán X citas de las próximas Y horas"
  → Toggle: Cancelar citas afectadas
  → Toggle: Notificar clientes por WhatsApp
  → Botón "Registrar"
```

### Modal: REPROGRAMAR CITA (RescheduleModal)

```
  → Muestra datos de la cita actual (cliente, servicio, fecha)
  → Calendario para elegir nueva fecha (vista día/semana/mes)
  → Los horarios ocupados aparecen bloqueados
  → Campo de razón (texto)
  → Toggle: Notificar al cliente
  → Botón "Confirmar reprogramación"
```

### Modal: DETALLE DE KPI (KPIFilterModal)

Se abre al tocar una tarjeta de métrica en el dashboard:
- Para "Ocupación": barra de progreso + minutos ocupados/disponibles
- Para otras métricas: lista scrollable de las citas correspondientes

---

## 🔄 FLUJO COMPLETO DE UNA CITA

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ CLIENTE   │     │   SISTEMA    │     │    DUEÑA     │
│ reserva   │────▶│  Estado:     │────▶│ Ve solicitud │
│ una cita  │     │ "Pendiente"  │     │ en dashboard │
└──────────┘     └──────────────┘     └──────┬───────┘
                                              │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                        ┌──────────┐   ┌────────────┐   ┌──────────┐
                        │ ACEPTAR  │   │REPROGRAMAR │   │ CANCELAR │
                        │          │   │            │   │          │
                        │ Estado:  │   │ Elige nueva│   │ Estado:  │
                        │"Confirma-│   │ fecha/hora │   │"Rechazada│
                        │  da"     │   │            │   │  por     │
                        └────┬─────┘   └─────┬──────┘   │  dueño"  │
                             │               │          └──────────┘
                             ▼               ▼
                     ┌──────────────┐ ┌──────────────┐
                     │  WhatsApp    │ │  WhatsApp    │
                     │  automático  │ │  automático  │
                     │  al cliente  │ │  al cliente  │
                     └──────┬───────┘ └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   DÍA DE     │
                     │   LA CITA    │
                     └──────┬───────┘
                            │
                    ┌───────┼───────┐
                    ▼               ▼
             ┌──────────┐   ┌──────────┐
             │ ASISTIÓ  │   │ NO VINO  │
             │          │   │          │
             │ Estado:  │   │ Estado:  │
             │"Completa-│   │"No       │
             │  da"     │   │ asistió" │
             └──────────┘   └──────────┘
```

---

## 📊 RESUMEN DE DATOS ACTUALES (Mock/Simulados)

| Dato | Cantidad |
|------|----------|
| Servicios | 4 |
| Clientes registrados | 8 |
| Citas simuladas | 20 |
| Bloqueos de tiempo | 5 |
| Incidencias | 1 |
| Mensajes de WhatsApp | 4 |

---

## 💡 NOTAS IMPORTANTES

1. **Toda la información actualmente es simulada** (mock data). No hay conexión real a base de datos aún.
2. Las acciones como "Aceptar cita", "Cancelar", etc. actualmente solo muestran alertas — no modifican datos reales.
3. El backend está preparado para **Supabase** con el esquema `booking.*`.
4. Los mensajes de WhatsApp se registran pero no se envían realmente aún.
5. La app está preparada para funcionar tanto en **celulares** como en **computadoras/tablets** gracias al diseño responsivo.

---

> **Documento generado automáticamente a partir del código fuente de la aplicación.**
