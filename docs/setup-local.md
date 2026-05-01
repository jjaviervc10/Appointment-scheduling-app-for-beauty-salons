# Setup Local — Jaquelina López Barber Studio Backend

Esta guía explica cómo preparar el entorno local de desarrollo.

---

## Requisitos previos

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Supabase CLI | última | `npm install -g supabase` |
| Docker Desktop | cualquiera | https://www.docker.com/products/docker-desktop |
| Git | cualquiera | https://git-scm.com |

> Docker Desktop debe estar corriendo antes de usar Supabase CLI en local.

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/jl-barber-backend.git
cd jl-barber-backend
```

---

## Paso 2 — Configurar variables de entorno

```bash
cp .env.example .env
```

Abre `.env` y completa los valores. Para trabajo local puedes usar los valores que genera `supabase start` (ver Paso 4).

---

## Paso 3 — Iniciar Supabase local

```bash
supabase start
```

Esto levanta una instancia local de Supabase con Docker. Al terminar, muestra las credenciales locales:

```
API URL: http://127.0.0.1:54321
anon key: eyJ...
service_role key: eyJ...
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

Copia esos valores en tu `.env` bajo las variables `SUPABASE_LOCAL_*`.

---

## Paso 4 — Aplicar migraciones y seed

```bash
supabase db reset
```

Este comando:
1. Resetea la base de datos local
2. Aplica todas las migraciones en `supabase/migrations/`
3. Aplica el seed de `supabase/seed/seed.sql` (si existe)

> Si las migraciones aún no existen (Fase 1 pendiente), este paso no hará mucho. Es normal.

---

## Paso 5 — Abrir Supabase Studio local

Abre en el navegador:

```
http://127.0.0.1:54323
```

Desde ahí puedes explorar tablas, ejecutar SQL, ver logs, etc.

---

## Paso 6 (opcional) — Correr una Edge Function en local

```bash
supabase functions serve nombre-de-la-funcion
```

Las funciones están en `supabase/functions/`. En esta fase aún no hay funciones creadas.

---

## Detener el entorno local

```bash
supabase stop
```

---

## Conectarse al proyecto remoto (Supabase Cloud)

Para vincular este repositorio con tu proyecto en Supabase Cloud:

```bash
supabase login
supabase link --project-ref tu-project-ref
```

El `project-ref` lo encuentras en: **Supabase Dashboard → Project Settings → General → Reference ID**

---

## Comandos útiles

| Comando | Descripción |
|---|---|
| `supabase start` | Levanta Supabase local |
| `supabase stop` | Detiene Supabase local |
| `supabase db reset` | Resetea DB local + aplica migraciones + seed |
| `supabase db push` | Aplica migraciones pendientes en el proyecto remoto |
| `supabase migration new nombre` | Crea una nueva migración vacía |
| `supabase functions serve nombre` | Corre una Edge Function en local |
| `supabase functions deploy nombre` | Despliega una Edge Function en remoto |
| `supabase status` | Muestra el estado de la instancia local |
