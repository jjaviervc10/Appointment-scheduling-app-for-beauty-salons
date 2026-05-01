# Supabase Setup Checklist — Jaquelina López Barber Studio

Lista de verificación para conectar el proyecto al Supabase real.  
Sigue los pasos en orden. Cada sección tiene un checkbox para marcar.

---

## Auditoría de migraciones (hecho ✅)

- [x] Ninguna migración contiene `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, ni `DELETE FROM` sin `WHERE`
- [x] `001_initial_booking_schema.sql` usa `IF NOT EXISTS` en todo — es idempotente
- [ ] **Pendiente revisar manualmente:** `20260426000000_initial_schema.sql` usa `CREATE TYPE` sin `IF NOT EXISTS`. Si el schema `booking` ya existe en Supabase con los enums creados, `supabase db push` fallará con `type already exists`. Ver [sección de errores comunes](#errores-comunes) abajo.

---

## Paso 1 — Instalar Supabase CLI

### En Windows (Scoop) — recomendado

```powershell
# Instalar Scoop si no lo tienes
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | Invoke-Expression

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Verificar instalación

```powershell
supabase --version
# Debe mostrar: 2.x.x
```

> Si el comando no se reconoce después de instalar, recarga el PATH:
> ```powershell
> $env:PATH = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH', 'User')
> ```

---

## Paso 2 — Iniciar sesión en Supabase

```powershell
supabase login
```

Se abre una ventana del navegador. Inicia sesión con tu cuenta de Supabase y copia el token de acceso.

**Verificar:**

```powershell
supabase projects list
# Debe mostrar tu proyecto "jl-barber-backend" o similar
```

---

## Paso 3 — Linkear el proyecto remoto

Desde la raíz del repo:

```powershell
cd C:\Blueweb\jl-barber-backend
supabase link --project-ref hfmjmzyqzvrwmkvxwpia
```

Se pedirá la contraseña de la base de datos (la que usaste al crear el proyecto en Supabase).

**Verificar:**

```powershell
# Debe mostrar el proyecto linkeado sin errores
Get-Content supabase\.temp\project-ref
```

---

## Paso 4 — Configurar variables de entorno

```powershell
Copy-Item .env.example .env
```

Abre `.env` y completa los valores. Los encuentras en:

| Variable | Ubicación en Supabase |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → Project API Keys → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → Project API Keys → service_role |

> **⚠️ Nunca subas `.env` al repositorio.** El `.gitignore` ya lo excluye.

---

## Paso 5 — Aplicar migraciones

> **Sin Docker:** Este proyecto no tiene Docker instalado localmente.  
> El comando `supabase db push` trabaja directamente contra el proyecto Supabase remoto — no requiere Docker.

```powershell
supabase db push
```

Supabase CLI aplica solo los archivos con formato `<timestamp>_nombre.sql` que aún no estén en el historial de migraciones remotas.

**Qué archivos aplica:**

| Archivo | Estado esperado |
|---|---|
| `20260426000000_initial_schema.sql` | Se aplica la primera vez |
| `20260426213607_remote_schema.sql` | Vacío — se registra pero no hace nada |
| `001_initial_booking_schema.sql` | **No** — no tiene formato timestamp; es archivo de referencia |

**Verificar después de aplicar:**

```powershell
supabase db diff --schema booking
# Si no hay diferencias: "No schema changes found"
```

O en Supabase → Table Editor → verifica que existan las 14 tablas en el schema `booking`.

---

## Paso 6 — Crear el usuario owner

Antes de aplicar el seed, crea la cuenta del owner:

1. Abre **Supabase → Authentication → Users → Add user**
2. Completa con el email y contraseña del owner (Jaquelina)
3. Copia el UUID generado (columna "UID")

Luego verifica que se haya creado su fila en `booking.profiles`:

```sql
-- Ejecutar en Supabase → SQL Editor
SELECT id, role, full_name FROM booking.profiles;
```

Si no aparece, créala manualmente (necesitarás el trigger `on_auth_user_created` o hacerlo manual — ver sección de errores comunes).

---

## Paso 7 — Aplicar seed

1. Edita `supabase/seed/001_seed_initial_data.sql`
2. Busca el bloque comentado de `business_settings`
3. Descoméntalo y reemplaza el UUID placeholder con el UUID real del owner
4. Ejecuta en **Supabase → SQL Editor** (copia y pega el contenido completo)

**Verificar:**

```sql
-- En SQL Editor
SELECT name, duration_minutes FROM booking.services ORDER BY sort_order;
-- Debe mostrar 4 servicios

SELECT day_of_week, start_time, end_time FROM booking.weekly_availability ORDER BY day_of_week;
-- Debe mostrar 6 filas (lunes a sábado)

SELECT name, message_type FROM booking.message_templates ORDER BY created_at;
-- Debe mostrar 7 templates
```

---

## Paso 8 — Verificar RLS

Comprueba que RLS esté activo en todas las tablas:

```sql
-- En SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'booking'
ORDER BY tablename;
-- rowsecurity debe ser TRUE en todas las tablas
```

---

## Paso 9 — Probar una RPC básica

Desde Supabase → SQL Editor, autenticándote como cliente de prueba, o con el anon key:

```sql
-- Lista los servicios activos
SELECT * FROM booking.services WHERE is_active = true;

-- Slots disponibles para la próxima semana
SELECT * FROM booking.get_available_slots(
  (SELECT id FROM booking.services WHERE name = 'Corte de cabello'),
  CURRENT_DATE::date
);
```

---

## Checklist de verificación final

- [ ] `supabase --version` muestra 2.x.x
- [ ] `supabase projects list` muestra el proyecto
- [ ] `supabase link` exitoso
- [ ] `.env` configurado con claves reales (no subido a git)
- [ ] `supabase db push` aplicó migraciones sin errores
- [ ] 14 tablas visibles en Supabase → Table Editor
- [ ] RLS activo en todas las tablas (`rowsecurity = TRUE`)
- [ ] Usuario owner creado en Auth
- [ ] Fila en `booking.profiles` con `role = 'owner'`
- [ ] Seed ejecutado: 4 servicios, 6 días, 7 templates
- [ ] `business_settings` insertado con UUID real del owner
- [ ] RPC `get_available_slots` devuelve slots

---

## Errores comunes

### `ERROR: type "booking.user_role" already exists`

**Causa:** El schema `booking` ya existe en Supabase con los tipos creados, y `20260426000000_initial_schema.sql` usa `CREATE TYPE` sin `IF NOT EXISTS`.

**Solución:**
- Si el schema ya está aplicado correctamente en Supabase, registra manualmente la migración para que CLI no intente re-ejecutarla:

```powershell
supabase migration repair --status applied 20260426000000
```

- Si el schema no está aplicado y el error persiste, limpia los tipos parciales y vuelve a ejecutar.

---

### `ERROR: relation "booking.profiles" does not exist` al ejecutar el seed

**Causa:** Las migraciones no se aplicaron antes del seed.  
**Solución:** Ejecuta `supabase db push` primero.

---

### El owner no tiene fila en `booking.profiles` después de crear la cuenta en Auth

**Causa:** El trigger `on_auth_user_created` que crea automáticamente el perfil puede no estar configurado aún (es parte de Fase 2).

**Solución manual hasta implementar el trigger:**

```sql
INSERT INTO booking.profiles (id, role, full_name, is_active)
VALUES ('<UUID-del-owner>', 'owner', 'Jaquelina López', true)
ON CONFLICT (id) DO NOTHING;
```

---

### `supabase db push` dice "remote database is ahead of local migrations"

**Causa:** Hay migraciones aplicadas en el proyecto remoto que no están en tu carpeta local.

**Diagnóstico:**

```powershell
supabase migration list
```

Esto muestra qué migraciones están en local vs remoto. Para sincronizar, crea archivos de migración locales que correspondan a las remotas.

---

### `supabase: command not found` en PowerShell

```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH', 'User')
```

---

_Última revisión: 2026-04-26_
