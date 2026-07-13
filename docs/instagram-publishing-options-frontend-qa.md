# Instagram Publishing Options - Frontend QA

## Objetivo

Conectar la card **Crear publicación** de `/owner/marketing` con las opciones ya disponibles en `prepare-instagram`, sin modificar backend y sin ejecutar `/publish`.

## Opciones UI

- Destino con valor inicial **Feed** y selector **Feed / Historia**.
- Feed muestra el switch **Incluir enlace de WhatsApp**.
- El mensaje de WhatsApp es opcional y sólo aparece cuando el CTA está activo.
- Historia oculta el CTA y muestra: “Las historias no admiten enlace de WhatsApp en este flujo.”
- El wizard se conserva como `Contenido → Guardar → Preparar → Publicar`.

## Navegación reversible del wizard

- Los pasos disponibles son seleccionables y muestran visualmente cuál está activo.
- **Contenido** permite revisar el archivo, prompt, estilo o caption sin borrar la última media guardada.
- **Guardar** conserva la imagen y el último resultado mientras el usuario sólo navega entre pasos.
- Una modificación real de archivo, prompt, estilo o caption marca el contenido como pendiente, elimina únicamente la preparación obsoleta y exige guardar antes de preparar otra vez.
- **Preparar** conserva la media guardada, elimina únicamente la preparación previa y permite revisar destino, WhatsApp y preview antes de preparar otra vez.
- **Publicar** sólo se habilita después de una preparación válida y no publica al seleccionar el paso; la acción continúa detrás del botón y modal de confirmación.
- Los pasos pendientes permanecen deshabilitados para impedir saltos a estados inválidos.

## Vista previa local

- Se muestra por defecto después de guardar la media y puede ocultarse con **Ocultar vista previa**.
- Feed representa imagen cuadrada, cuenta y caption. Cuando corresponde, el enlace `wa.me` enmascarado aparece como texto continuo dentro del caption, sin tarjeta ni botón publicitario.
- Historia representa un lienzo vertical 9:16 sin caption ni CTA de WhatsApp.
- La vista se actualiza localmente al cambiar destino, switch o mensaje y no ejecuta requests.
- Se identifica como **Aproximada** porque Instagram puede variar tipografía, recorte y saltos de línea.

El botón verde **Chatear por WhatsApp** pertenece a un flujo de Ads/Click-to-WhatsApp y queda fuera de este sprint. El flujo actual agrega el enlace de WhatsApp dentro del caption del feed orgánico.

### Probar WhatsApp

- Con Feed y **Incluir enlace de WhatsApp** activos aparece el botón local **Probar WhatsApp**.
- La acción construye `https://wa.me/<teléfono>?text=<mensaje>` eliminando caracteres no numéricos del teléfono y codificando el mensaje.
- Usa el mensaje escrito por el Owner o `Hola, quiero agendar una cita en JL Barber Studio.` como valor predeterminado.
- Abre el enlace mediante `Linking.openURL`; es una prueba dentro de JL Barber Studio y no simula un botón nativo de Instagram.
- La preview muestra `wa.me/5216143278357?text=…` y el mensaje en formato humano, sin exponer la cadena codificada completa.

## Payload de preparación

- Feed sin WhatsApp: `{ "destination": "feed" }`.
- Feed con WhatsApp: `{ "destination": "feed", "includeWhatsAppCta": true }`, agregando `whatsappMessage` sólo cuando el texto no está vacío.
- Historia: `{ "destination": "story" }` sin campos de WhatsApp.
- El servicio sigue aceptando una llamada sin opciones para conservar compatibilidad.

## Resultados QA técnico

| Validación | Resultado |
| --- | --- |
| `npx.cmd tsc --noEmit` | Aprobado |
| `npx.cmd expo export --platform web --output-dir dist-instagram-publishing-options` | Aprobado |
| `git diff --check` | Aprobado |
| Escaneo de secretos, llamadas directas, `any` y `ts-ignore` en archivos modificados | Aprobado |
| Export web servido en `localhost:8082` | Aprobado, `HTTP 200` |

## QA local y visual mobile

Se intentó levantar `npm.cmd run web -- --port 8082`. El proceso mostró el inicio de Expo, pero terminó antes de abrir el puerto y no entregó una página HTTP. Por esa limitación del entorno no fue posible completar una sesión Owner autenticada ni certificar visualmente en navegador los casos A-E.

El export generado sí se sirvió localmente en `localhost:8082` mediante un servidor estático y respondió `HTTP 200` con el documento web. Este smoke test confirma que el artefacto exportado puede cargarse, pero no sustituye el recorrido visual autenticado.

La revisión estática confirmó:

- Feed inicia con WhatsApp apagado.
- Activar CTA revela el campo opcional y genera el payload esperado.
- Cambiar de Feed a Historia apaga el CTA, conserva el mensaje local y excluye todos los campos de WhatsApp del request.
- Los tres modos existentes (upload manual, generar con IA y editar con IA) comparten las mismas opciones después de guardar media.
- Los textos de éxito y el modal cambian según Feed o Historia.
- La preview de Feed e Historia comparte la imagen guardada y no expone el teléfono real.
- El wizard permite regresar de Publicar a Preparar y navegar por Contenido/Guardar sin perder la media; sólo los cambios reales invalidan los estados posteriores.

## Network QA y no publish

- No se ejecutó `/publish` durante este QA.
- No se invocó manualmente `prepare-instagram`, porque no hubo sesión Owner ni media de prueba disponible en runtime.
- No se produjo ninguna publicación visible desde este trabajo.
- La ruta `/publish` continúa separada detrás del modal de confirmación; abrir/cancelar el modal no llama al hook de publicación.

## Seguridad

Los componentes visuales no agregan `fetch`. La preparación usa `apiClient` mediante servicio y hook. La integración no contiene secretos, tokens hardcodeados ni llamadas directas a OpenAI, Supabase, Instagram Graph o Facebook Graph.

## Pendientes

- Ejecutar QA visual mobile A-E en un navegador con sesión Owner válida y backend accesible.
- Confirmar en Network los tres bodies de `prepare-instagram` y que cancelar el modal no genera `/publish`.
- Revisar QA visual antes de crear cualquier commit.
