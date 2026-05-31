# Instalacion PWA

La app web de Jaquelina Lopez Barber Studio esta preparada para instalarse desde navegadores compatibles como PWA. No reemplaza una app nativa: el navegador decide si muestra el prompt automatico de instalacion.

## Archivos requeridos

- `public/manifest.json`: metadatos de la app instalable.
- `public/service-worker.js`: service worker basico para assets estaticos y navegacion network-first.
- `public/assets/icons/icon-192.png`: icono PWA de 192 px.
- `public/assets/icons/icon-512.png`: icono PWA de 512 px.
- `public/assets/icons/maskable-512.png`: icono maskable para Android.
- `app/+html.tsx`: vincula manifest, theme color y apple touch icon.
- `scripts/inject-pwa-head.mjs`: asegura que `dist/index.html` tenga los tags PWA tras `expo export`.
- `netlify.toml`: ejecuta el post-proceso PWA despues del export.
- `src/utils/registerServiceWorker.ts`: registra el service worker solo en produccion web HTTPS.
- `src/components/pwa/InstallAppPrompt.tsx`: muestra el boton o instrucciones de instalacion en la landing publica.

## Instalar en Android

1. Abrir `https://barberjaquelinalopezstudio.netlify.app` en Chrome.
2. Si aparece el boton `Instalar app`, tocarlo y confirmar.
3. Si Chrome no muestra el prompt automatico, abrir el menu de tres puntos.
4. Tocar `Instalar app` o `Agregar a pantalla principal`.

### Firefox en Android

Firefox no siempre permite disparar el instalador PWA desde un boton dentro de la pagina. En ese caso la landing muestra `Abrir en Chrome`:

1. Tocar `Abrir en Chrome`.
2. Cuando la pagina abra en Chrome, tocar `Instalar aplicacion`.
3. Confirmar la instalacion.
4. Si Chrome no se abre, tocar `Copiar link` y abrirlo manualmente en Chrome o Edge.

El navegador no permite iniciar automaticamente la instalacion despues de cambiar de Firefox a Chrome; Chrome requiere una accion del usuario dentro de Chrome.

## Instalar en iPhone

1. Abrir `https://barberjaquelinalopezstudio.netlify.app` en Safari.
2. Tocar el boton de compartir.
3. Elegir `Agregar a pantalla de inicio`.
4. Confirmar el nombre y tocar `Agregar`.

## Limitaciones por navegador

- iPhone/Safari no dispara `beforeinstallprompt`; la instalacion siempre es manual desde compartir.
- Chrome/Android puede retrasar u ocultar el prompt si el navegador aun no considera instalable la app.
- Firefox no soporta el prompt automatico de instalacion igual que Chrome/Edge; se debe usar menu manual o abrir el link en un navegador Chromium.
- Navegadores dentro de otras apps, como WebView o pestañas internas, pueden no permitir instalar.
- El service worker no cachea `/api/*`, requests con `Authorization` ni fallback offline para rutas owner o miniapp.

## Probar en Netlify

Verificar estas URLs despues del deploy:

- `https://barberjaquelinalopezstudio.netlify.app/manifest.json`
- `https://barberjaquelinalopezstudio.netlify.app/assets/icons/icon-192.png`
- `https://barberjaquelinalopezstudio.netlify.app/assets/icons/icon-512.png`
- `https://barberjaquelinalopezstudio.netlify.app/assets/icons/maskable-512.png`
- `https://barberjaquelinalopezstudio.netlify.app/service-worker.js`

## Validar en Chrome

1. Abrir DevTools.
2. Ir a `Application`.
3. Revisar `Manifest`: no debe mostrar errores de iconos, scope, start URL o display.
4. Revisar `Service Workers`: debe aparecer `/service-worker.js` como registrado y activo.
5. Ejecutar Lighthouse con la categoria PWA o revisar la seccion de instalabilidad.
