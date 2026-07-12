# OpenAI Media Frontend QA

## Objetivo

Integrar en `/owner/marketing` tres modos para crear una publicacion de Instagram desde el frontend:

- Subir imagen
- Generar con IA
- Editar imagen con IA

El frontend consume solamente el backend Owner en Railway. No llama OpenAI, Supabase ni Instagram Graph de forma directa.

## Endpoints Consumidos

Base:

```txt
https://striking-caring-production.up.railway.app
```

Endpoints Owner:

```txt
POST /api/owner/marketing/media/upload
POST /api/owner/marketing/media/generate
POST /api/owner/marketing/media/edit
GET  /api/owner/marketing/media
GET  /api/owner/marketing/media/:id
POST /api/owner/marketing/media/:id/prepare-instagram
POST /api/owner/instagram/publish
```

`/publish` permanece detras de confirmacion explicita del Owner.

## Modos UI

La card `Crear publicacion` usa un selector compacto:

- `Subir imagen`: selecciona JPG/PNG/WebP y guarda el archivo.
- `Generar con IA`: solicita prompt requerido, estilo opcional y caption opcional.
- `Editar con IA`: solicita imagen de referencia, prompt requerido, estilo opcional y caption opcional.

El wizard comun es:

```txt
Contenido -> Guardar -> Preparar -> Publicar
```

## Validaciones Frontend

- Imagen requerida para upload/edit.
- MIME permitido: `image/jpeg`, `image/png`, `image/webp`.
- Maximo 10 MB por imagen.
- Prompt requerido para IA.
- Prompt minimo: 10 caracteres.
- Prompt maximo: 1000 caracteres.
- Caption maximo: 2200 caracteres.

## Seguridad

- No se muestra `publicUrl`.
- No se muestra URL de Supabase.
- No se muestra `mediaId`.
- No se muestra `creationId`.
- No se muestra storage path.
- No se manejan tokens OpenAI, Supabase o Instagram en frontend.
- No hay publicacion automatica.

## QA Tecnico

Resultado de ejecucion:

```txt
npx.cmd tsc --noEmit: passed
npx.cmd expo export --platform web --output-dir dist-marketing-openai-frontend: passed
git diff --check: passed
```

Nota: `git diff --check` solo mostro warnings de CRLF esperados en Windows.

## QA Local

Validacion automatizable desde terminal:

- `/owner/marketing` en `localhost:8082`: 200.

Pendiente de validacion visual manual autenticada:

- `/owner/marketing` carga en `localhost:8082`.
- Selector de modo visible en mobile.
- Upload manual sigue funcionando.
- Generate muestra prompt, estilo y caption.
- Edit muestra imagen de referencia, prompt, estilo y caption.
- Loading claro durante generate/edit.
- Preview aparece al terminar upload/generate/edit.
- Preparar Instagram funciona para los tres modos.
- Boton `Publicar en Instagram` aparece dentro de la card.
- Modal de publish aparece antes de publicar.
- Cancelar modal no llama `/publish`.

## Busqueda de Seguridad

Resultado:

- Sin `OPENAI_API_KEY`.
- Sin `SUPABASE_SERVICE_ROLE_KEY`.
- Sin `INSTAGRAM_ACCESS_TOKEN`.
- Sin `graph.instagram`.
- Sin `graph.facebook`.
- Sin `api.openai.com`.
- Sin `access_token`.
- Sin `any`.
- Sin `ts-ignore`.
- Sin `fetch(` en componentes, hook o servicio nuevo de marketing media.
- `Bearer` aparece solo en `src/services/apiClient.ts` como header dinamico con token de sesion.

## Resultado Railway

El backend ya fue validado previamente en Railway:

- Health 200.
- Generate valido produjo `mediaId`, `status`, `sourceType` y `publicUrl` presente.
- Edit valido produjo `mediaId`, `status`, `sourceType` y `publicUrl` presente.
- Prepare Instagram produjo `creationId`.
- No se ejecuto `/publish`.
- No hubo publicacion visible.

## Pendientes

- QA visual autenticado en mobile.
- QA frontend contra Railway con sesion Owner.
- Revision final antes de commit.
