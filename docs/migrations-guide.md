# Guía de Migraciones — Jaquelina López Barber Studio

## Tabla de contenidos

1. [Estructura de archivos](#estructura-de-archivos)
2. [Convención de nombres](#convención-de-nombres)
3. [Cómo aplicar el schema inicial](#cómo-aplicar-el-schema-inicial)
4. [Cómo aplicar el seed](#cómo-aplicar-el-seed)
5. [Cómo crear nuevas migraciones](#cómo-crear-nuevas-migraciones)
6. [Flujo completo para producción](#flujo-completo-para-producción)
7. [Referencia de archivos existentes](#referencia-de-archivos-existentes)
8. [Errores comunes y soluciones](#errores-comunes-y-soluciones)

---

## Estructura de archivos

```
supabase/
├── migrations/
│   ├── 001_initial_booking_schema.sql      ← schema completo (referencia)
│   ├── 20260426000000_initial_schema.sql   ← versión para Supabase CLI
│   └── README.md
└── seed/
    ├── 001_seed_initial_data.sql           ← datos iniciales del negocio
    └── README.md
```

---

## Convención de nombres

El proyecto usa **dos tipos** de archivos de migración:

### Archivos `001_` (referencia documentada)

| Archivo | Propósito |
|---|---|
| `001_initial_booking_schema.sql` | Schema completo con `IF NOT EXISTS` — idempotente, seguro correr en cualquier estado |
| `001_seed_initial_data.sql` | Datos iniciales del negocio (servicios, horarios, templates) |

**Importante:** El prefijo `001_` NO sigue el formato de timestamp requerido por Supabase CLI.  
Estos archivos **no se ejecutan automáticamente** con `supabase db push`.  
Son archivos de referencia/documentación y para ejecución manual.

### Archivos `<timestamp>_` (Supabase CLI)

Formato: `YYYYMMDDHHMMSS_nombre_descriptivo.sql`  
Ejemplo: `20260426000000_initial_schema.sql`

Supabase CLI rastrea estos archivos en la tabla `supabase_migrations.schema_migrations`.  
Una vez aplicados, **no se vuelven a ejecutar**.

---

## Cómo aplicar el schema inicial

### Opción A: SQL Editor de Supabase (recomendada — sin Docker)

1. Abre [app.supabase.com](https://app.supabase.com) → tu proyecto → **SQL Editor**
2. Copia y pega el contenido de `supabase/migrations/001_initial_booking_schema.sql`
3. Ejecuta

El archivo usa `CREATE ... IF NOT EXISTS` en todo, por lo que **es idempotente** — si algo ya existe, simplemente lo omite sin error.

### Opción B: Supabase CLI (requiere el archivo con timestamp)

```powershell
# Asegúrate de estar autenticado y el proyecto esté vinculado
supabase login
supabase link --project-ref hfmjmzyqzvrwmkvxwpia

# Aplica todas las migraciones pendientes con timestamp
supabase db push
```

El archivo `20260426000000_initial_schema.sql` es el que CLI aplica con `db push`.

> **Sin Docker:** En este proyecto no está instalado Docker.  
> `supabase start` y `supabase db pull` no funcionarán localmente.  
> Usa siempre el SQL Editor de Supabase o `supabase db push` (que trabaja contra el proyecto remoto).

---

## Cómo aplicar el seed

El seed contiene los datos iniciales del negocio: servicios, disponibilidad semanal y templates de mensajes.

### Paso 1: Configurar business_settings

Antes de ejecutar el seed, debes tener el UUID del owner:

1. Crea la cuenta del owner en **Supabase → Authentication → Users** (Email/Password)
2. Copia el UUID generado
3. Edita `supabase/seed/001_seed_initial_data.sql`
4. Busca el bloque comentado de `business_settings` y descoméntalo
5. Reemplaza `00000000-0000-0000-0000-000000000000` con el UUID real

### Paso 2: Asegurar que profiles existe

El owner necesita una fila en `booking.profiles`. Si tienes el trigger `on_auth_user_created` activo en Supabase Auth, se crea automáticamente. Si no, créala manualmente:

```sql
INSERT INTO booking.profiles (id, role, full_name, is_active)
VALUES ('<UUID-del-owner>', 'owner', 'Jaquelina López', true);
```

### Paso 3: Ejecutar el seed

**Opción A — SQL Editor:**

1. Copia y pega `supabase/seed/001_seed_initial_data.sql` en el SQL Editor
2. Ejecuta

**Opción B — Supabase CLI:**

```powershell
# Obtener la DATABASE_URL del proyecto
# (Supabase → Settings → Database → Connection String → URI)
supabase db seed --db-url "postgresql://postgres:[password]@db.hfmjmzyqzvrwmkvxwpia.supabase.co:5432/postgres" --file supabase/seed/001_seed_initial_data.sql
```

---

## Cómo crear nuevas migraciones

### Generar archivo con timestamp automático

```powershell
supabase migration new nombre_descriptivo_en_snake_case
```

Esto crea `supabase/migrations/<timestamp>_nombre_descriptivo_en_snake_case.sql` listo para editar.

### Ejemplos de nombres descriptivos

```
add_promo_codes_table
add_index_appointments_client_status
alter_services_add_price_column
drop_column_old_field
```

### Estructura recomendada para una migración nueva

```sql
-- ============================================================
-- Migración: <timestamp>_nombre.sql
-- Descripción: Qué hace esta migración y por qué
-- ============================================================

-- Siempre dentro del schema booking
SET search_path TO booking;

-- Tu SQL aquí
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS external_ref text;
```

### Aplicar la migración nueva

```powershell
supabase db push
```

---

## Flujo completo para producción

> **⚠️ Siempre haz un backup antes de modificar producción.**

```
Supabase → Settings → Database → Backups → Crear backup manual
```

### Primer deploy (base de datos vacía)

```
1. Ejecutar 001_initial_booking_schema.sql  → crea todo el schema
2. Crear cuenta del owner en Auth
3. Editar y ejecutar 001_seed_initial_data.sql → datos base
4. Verificar con: SELECT * FROM booking.services;
```

### Deploys subsecuentes (nueva migración)

```
1. Crear archivo: supabase migration new <nombre>
2. Escribir el SQL
3. Probar localmente (si se tiene Docker) o en un proyecto de staging
4. supabase db push
5. Verificar en producción
```

---

## Referencia de archivos existentes

| Archivo | Descripción | Ejecutar con |
|---|---|---|
| `001_initial_booking_schema.sql` | Schema completo idempotente. 11 enums, 14 tablas, índices, funciones, triggers, RLS. | SQL Editor / manual |
| `20260426000000_initial_schema.sql` | Mismo schema para Supabase CLI. | `supabase db push` |
| `20260426213607_remote_schema.sql` | Vacío (intento de `db pull` fallido por falta de Docker). Ignorar. | — |
| `001_seed_initial_data.sql` | 4 servicios, 6 días de disponibilidad, 7 templates de mensajes, placeholder para business_settings. | SQL Editor / `db seed` |

---

## Errores comunes y soluciones

### `ERROR: schema "booking" does not exist`

**Causa:** Intentaste ejecutar una migración que referencia el schema `booking` antes de crearlo.  
**Solución:** Ejecuta primero `001_initial_booking_schema.sql` que incluye `CREATE SCHEMA IF NOT EXISTS booking`.

---

### `ERROR: type "booking.user_role" already exists`

**Causa:** Corres la migración en una BD donde ya existe el type.  
**Solución:** Usa el archivo `001_initial_booking_schema.sql` (tiene `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`).

---

### `ERROR: foreign key constraint "..." cannot be implemented`

**Causa:** Intentas insertar en una tabla cuya FK referencia un registro que no existe.  
**Ejemplo:** Insertar en `business_settings` con un `owner_profile_id` que no está en `profiles`.  
**Solución:** Crea el profile del owner primero (ver [Cómo aplicar el seed](#cómo-aplicar-el-seed)).

---

### `supabase db push` dice "remote database is ahead of local migrations"

**Causa:** El estado de la BD remota tiene migraciones que no están en tu carpeta local.  
**Solución:**

```powershell
supabase db pull  # requiere Docker instalado
# Si no tienes Docker, sincroniza manualmente creando los archivos de migración que faltan
```

---

### `supabase: command not found` en PowerShell

**Causa:** PATH no se actualizó después de instalar con Scoop.  
**Solución:**

```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH', 'User')
```

---

_Última actualización: 2026-04-26_
