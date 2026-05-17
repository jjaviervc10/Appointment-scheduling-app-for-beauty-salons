# Plan de autenticación — Owner Login con OWNER_SECRET

**Fecha:** 2026-05-16
**Estado:** Aprobado para implementación (MVP Fase 1)
**Autor:** QA / Frontend Analysis Session

---

## Contexto

La pantalla de inicio (`app/index.tsx`) actualmente expone el botón
"Acceso propietario" que redirige directamente a `/(owner)/dashboard` sin
ninguna verificación. Cualquier usuario puede acceder al panel de la dueña
simplemente tocando ese botón o navegando a la URL directa.

Este documento describe el plan de autenticación MVP que protege las rutas
del owner sin requerir cambios en el backend ni en Supabase.

---

## Decisión de diseño

### Owner: OWNER_SECRET como contraseña

| Opción evaluada | Seguridad | Complejidad | Requiere backend | Elegida |
|---|---|---|---|---|
| Solo número de celular | Baja ❌ | Mínima | No | No |
| Número + PIN de 4 dígitos | Media | Baja | No | No |
| **Solo OWNER_SECRET** | **Media ✅** | **Mínima ✅** | **No ✅** | **✅ Sí** |
| Número + OTP por WhatsApp | Alta | Alta | Sí | No (Fase 2) |
| Supabase Auth completo | Alta | Alta | Sí | No (Fase 2) |

### Por qué OWNER_SECRET es correcto para MVP

1. Ya existe: `EXPO_PUBLIC_OWNER_SECRET` está configurado en Netlify y
   Railway. El frontend ya lo lee en `src/config/api.ts`.

2. Ya es la contraseña real del sistema: el backend valida exactamente
   este valor como `Authorization: Bearer <OWNER_SECRET>` en todos los
   endpoints owner. No hay un segundo secreto más seguro.

3. Es una cadena larga y aleatoria, no un PIN corto predecible.

4. La comparación es local (sin red). No viajan credenciales por HTTP.

5. El número de celular de Jaquelina es público (clientes lo tienen,
   aparece en WhatsApp Business). Usarlo como único factor de acceso al
   dashboard sería una brecha de seguridad directa.

### Transparencia sobre exposición de EXPO_PUBLIC_*

Las variables con prefijo `EXPO_PUBLIC_` se incrustan en el bundle JS en
tiempo de build. Alguien técnico podría extraerlas del archivo estático.
Esto es aceptable para este MVP porque:

- El mismo valor ya viaja en cada request al backend hoy.
- No es una app de salud ni bancaria.
- Para Fase 2 se reemplaza por Supabase Auth y este mecanismo queda obsoleto.

---

## Flujo completo post-implementación

```
barberjaquelinalopezstudio.netlify.app
          |
          v
    app/index.tsx  (pantalla de inicio - siempre pública)
    ┌─────────────────────────────────────────────────────┐
    │  [Imagen de marca]                                  │
    │  [Reservar ahora]      → /(client)/home             │
    │  [Ver disponibilidad]  → /(client)/booking          │
    │  [Acceso propietario]  → /(owner)/login  (NUEVO)    │
    └─────────────────────────────────────────────────────┘
                                    |
              ┌─────────────────────┴──────────────────────┐
              |                                            |
              v                                            v
    /(client)/home                              /(owner)/login  (NUEVO)
    /(client)/booking                           "Ingresa tu contraseña"
    /(client)/my-appointments                           |
    (tabs, sin autenticación)              inputValue === OWNER_SECRET ?
                                                  |           |
                                                 Sí          No
                                                  |           |
                                    AsyncStorage.setItem  "Contraseña incorrecta"
                                    'owner_authenticated'
                                    = 'true'
                                                  |
                                                  v
                                    /(owner)/dashboard
                                    /(owner)/agenda
                                    /(owner)/clients
                                    /(owner)/messages
                                    /(owner)/settings
                                    (guard protege todo el grupo)
```

---

## Archivos a crear / modificar

### 1. CREAR: `app/(owner)/login.tsx`

Pantalla de login del owner. Diseño coherente con el design system
(fondo negro, acento dorado, logo de la marca).

Campos:
- Campo de contraseña (type=password, oscurecido)
- Botón "Entrar" que ejecuta la validación local
- Mensaje de error si la contraseña es incorrecta
- Sin campo de usuario — la contraseña sola identifica al owner

Lógica:
```tsx
import { OWNER_SECRET } from '../../src/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleLogin = async () => {
  if (inputValue.trim() === OWNER_SECRET) {
    await AsyncStorage.setItem('owner_authenticated', 'true');
    router.replace('/(owner)/dashboard');
  } else {
    setError('Contraseña incorrecta');
  }
};
```

### 2. MODIFICAR: `app/(owner)/_layout.tsx`

Agregar guard de autenticación. Si no hay sesión activa en AsyncStorage,
redirigir a login antes de renderizar cualquier pantalla del owner.

```tsx
useEffect(() => {
  AsyncStorage.getItem('owner_authenticated').then((val) => {
    if (val !== 'true') {
      router.replace('/(owner)/login');
    }
  });
}, []);
```

El botón "Cerrar sesión" en el sidebar ya llama `router.replace('/')`.
Solo agregar la limpieza de AsyncStorage:

```tsx
const handleLogout = async () => {
  await AsyncStorage.removeItem('owner_authenticated');
  router.replace('/');
};
```

### 3. MODIFICAR: `app/index.tsx`

El botón "Acceso propietario" ya apunta a `/(owner)/dashboard`.
El guard en `_layout.tsx` interceptará y redirigirá a `/owner/login`
automáticamente si no hay sesión. **No requiere cambio en index.tsx.**

Opcional: cambiar la ruta del botón a `/(owner)/login` para que la
navegación sea más explícita y directa:

```tsx
onPress={() => router.replace('/(owner)/login')}
```

### 4. NO MODIFICAR: `src/config/api.ts`

`OWNER_SECRET` ya se exporta desde aquí. El login lo importa directamente.
Sin cambios necesarios.

### 5. NO MODIFICAR: `src/hooks/useAuth.ts`

El hook de auth actual está mockeado y no se usa activamente en las
pantallas del owner ni del cliente. Se deja intacto para la futura
migración a Supabase Auth (Fase 2). El guard del layout no lo usa.

---

## Comportamiento esperado por escenario

| Escenario | Resultado esperado |
|---|---|
| Cliente toca "Reservar ahora" | Va directo a `/(client)/home` sin login |
| Cliente toca "Ver disponibilidad" | Va directo a `/(client)/booking` sin login |
| Cliente intenta acceder a `/owner/dashboard` en URL | Guard redirige a `/(owner)/login` |
| Owner toca "Acceso propietario" | Va a `/(owner)/login` |
| Owner ingresa contraseña correcta | AsyncStorage guardado → dashboard |
| Owner ingresa contraseña incorrecta | Mensaje de error, sin redirect |
| Owner cierra sesión | AsyncStorage limpiado → pantalla de inicio |
| Owner recarga la página con sesión activa | Guard detecta AsyncStorage → dashboard directo |
| Owner recarga la página sin sesión | Guard redirige a login |
| Cliente llega desde WhatsApp (miniapp) | Va directo a `miniapp/booking` etc. — no pasa por este flujo |

---

## Lo que NO requiere este plan

| Item | Por qué no se necesita |
|---|---|
| Endpoint nuevo en backend | La validación es local (string comparison) |
| Migración en Supabase | No toca la base de datos |
| Cambio de variables en Railway | OWNER_SECRET ya está configurado |
| Cambio de variables en Netlify | EXPO_PUBLIC_OWNER_SECRET ya está configurado |
| Instalar nuevas dependencias | AsyncStorage ya está en package.json |
| Cambios en las miniapps | Las 4 miniapps son rutas independientes del grupo `miniapp/` |

---

## Fase 2 (futura): Supabase Auth

Cuando se implemente autenticación completa:

1. Owner hace login con email + contraseña en Supabase Auth
2. `supabase.auth.getUser()` devuelve el perfil con `role = 'owner'`
3. El guard del layout verifica el rol en lugar de AsyncStorage
4. `EXPO_PUBLIC_OWNER_SECRET` deja de usarse como PIN de login
5. Los clientes pueden tener cuentas opcionales con su número de celular
   vinculado via WhatsApp OTP

El guard en `(owner)/_layout.tsx` solo cambia la fuente de verdad,
no su lógica de redirección.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Alguien extrae OWNER_SECRET del bundle JS | Baja (requiere conocimiento técnico) | Fase 2 con Supabase Auth elimina esto |
| Owner pierde/olvida la contraseña | Muy baja (es la misma que usa para el backend) | Está en Railway variables — Jaquelina puede consultarla ahí |
| Sesión de AsyncStorage no expira | Media | Aceptable para MVP; agregar expiración en Fase 1.5 si se requiere |

---

## Estado de implementación

- [ ] Crear `app/(owner)/login.tsx`
- [ ] Modificar `app/(owner)/_layout.tsx` — agregar guard
- [ ] Modificar `app/(owner)/_layout.tsx` — logout limpia AsyncStorage
- [ ] Modificar `app/index.tsx` — botón propietario → `/(owner)/login`
- [ ] QA: probar con contraseña correcta
- [ ] QA: probar con contraseña incorrecta
- [ ] QA: probar URL directa `/(owner)/dashboard` sin sesión
- [ ] QA: probar recarga con sesión activa
- [ ] QA: probar logout y re-ingreso
