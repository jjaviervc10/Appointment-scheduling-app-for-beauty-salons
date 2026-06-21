# Plataforma de Gestión de Citas y Automatización por WhatsApp
## Documento comercial para negocios de servicios

**Solución adaptable para:** salones de uñas, barberías, estéticas, spas, estudios de belleza, dentistas, consultorios y negocios que trabajan por citas.

**Enfoque:** aumentar reservas confirmadas, reducir trabajo manual, disminuir inasistencias y mejorar la experiencia del cliente desde WhatsApp.

---

## 1. Resumen ejecutivo

La plataforma centraliza la operación diaria de un negocio que trabaja por citas: agenda, clientes, servicios, disponibilidad, bloqueos, solicitudes, confirmaciones, recordatorios y comunicación por WhatsApp.

El objetivo principal es que el negocio deje de depender de agendas en papel, conversaciones dispersas, capturas manuales y seguimiento repetitivo. La plataforma convierte el proceso de atención en un flujo ordenado: el cliente puede solicitar una cita desde una experiencia móvil simple, el dueño valida la agenda desde su dashboard y WhatsApp automatiza gran parte de la comunicación.

Para una empresaria con varios salones de uñas, por ejemplo, el valor está en tener una operación más controlada: menos mensajes manuales, menos citas duplicadas, más visibilidad de pendientes, historial de clientes y una base lista para crecer hacia multi-sucursal, reportes avanzados e inteligencia artificial.

---

## 2. Auditoría del producto

### 2.1 Funcionalidades implementadas

El producto ya cuenta con una base funcional completa para operar un negocio de servicios por citas:

| Área | Funcionalidades disponibles |
| --- | --- |
| Reservas | Solicitud de citas desde experiencia pública y mini app móvil. |
| Agenda | Visualización de citas, disponibilidad, bloqueos y estados operativos. |
| Dashboard administrativo | Panel para propietario con indicadores, acciones rápidas, citas pendientes y actividad del día. |
| Clientes | Registro, búsqueda, historial, próximas citas y métricas por cliente. |
| Servicios | Catálogo de servicios activo para reservas y gestión administrativa. |
| Disponibilidad | Horarios semanales configurables y control de disponibilidad por fecha. |
| Bloqueos de agenda | Bloqueo de horarios por descanso, eventos, citas externas o indisponibilidad. |
| Estados de citas | Solicitud, aprobación, rechazo, confirmación, cancelación, completado y seguimiento operativo. |
| Reprogramación | Flujos para solicitar cambios de cita desde enlaces seguros. |
| Cancelación | Cancelación desde mini app con confirmación y motivo. |
| Confirmaciones | Confirmación de citas y seguimiento del estado de asistencia. |
| WhatsApp | Integración para atención, mensajes outbound, mensajes inbound, historial y seguimiento. |
| Mini app | Flujo embebido para reservar, reprogramar y cancelar desde una experiencia mobile-first. |
| Mensajería | Panel de mensajes enviados y recibidos, estados, filtros y atención humana. |
| Prevención de conflictos | Validación de disponibilidad para evitar doble reserva. |
| PWA | La aplicación puede instalarse desde navegadores compatibles como app web. |

### 2.2 Funcionalidades parcialmente implementadas

Estas capacidades existen como base o flujo inicial, pero requieren maduración para venderse como funcionalidad avanzada:

| Área | Estado actual |
| --- | --- |
| Multi-sucursal | El producto está preparado conceptualmente para negocios escalables, pero el MVP actual opera principalmente como negocio único. |
| Multi-empleado | La agenda gestiona disponibilidad del negocio; falta separar calendarios por colaborador, cabina, silla o estación. |
| Autenticación avanzada | Existe acceso propietario, pero falta robustecer roles, permisos y operación multiusuario. |
| Reportería financiera | Hay métricas operativas; falta reporte de ingresos, ticket promedio, conversión, productividad y sucursales. |
| WhatsApp interactivo avanzado | Hay base de automatización y mensajes; pueden ampliarse botones, plantillas, medios y campañas. |
| Reprogramación por intención general | Existen flujos tokenizados; algunos flujos conversacionales pueden seguir creciendo para ser más automáticos. |
| App nativa | No existe app nativa; actualmente la solución se enfoca en web instalable y mini app móvil. |
| IA conversacional | No está implementada como módulo principal; es una expansión natural para etapas futuras. |

### 2.3 Funcionalidades futuras recomendadas

Para convertir el producto en una solución SaaS B2B más fuerte, las siguientes extensiones serían de alto valor:

| Prioridad | Expansión sugerida | Valor comercial |
| --- | --- | --- |
| Alta | Multi-sucursal | Vender a cadenas, franquicias y negocios con varias ubicaciones. |
| Alta | Agenda por empleado | Gestionar estilistas, manicuristas, barberos, dentistas o consultorios individuales. |
| Alta | Roles y permisos | Separar dueño, gerente, recepcionista y colaborador. |
| Alta | Reportes de ventas y ocupación | Medir desempeño, horas pico, servicios más vendidos y ausencias. |
| Media | Pagos, anticipos o depósitos | Reducir ausencias y asegurar compromiso del cliente. |
| Media | Campañas por WhatsApp | Reactivar clientes, promociones, recordatorios de mantenimiento y cumpleaños. |
| Media | Programa de lealtad | Aumentar recurrencia y retención. |
| Media | Inventario básico | Útil para salones, spas y estudios con productos físicos. |
| Futura | IA de atención | Responder preguntas frecuentes, recomendar servicios y sugerir horarios. |
| Futura | Pronóstico de demanda | Optimizar horarios, personal y promociones según ocupación. |

### 2.4 Integraciones existentes

La plataforma integra canales y componentes clave para operar en la vida real:

- WhatsApp como canal principal de comunicación con clientes.
- Mini app móvil para que el cliente reserve, reprograme o cancele sin instalar una app nativa.
- Aplicación web instalable para el dueño o usuarios recurrentes.
- Panel administrativo web para operación diaria.
- Sistema de mensajes enviados, recibidos y estados de entrega.
- Base de datos operativa para citas, clientes, servicios, disponibilidad, mensajes y eventos.

### 2.5 Automatizaciones existentes

La solución reduce tareas repetitivas mediante automatizaciones como:

- Registro de solicitudes de cita desde flujo móvil.
- Validación de horarios disponibles.
- Protección contra doble reserva.
- Confirmaciones automáticas.
- Recordatorios antes de la cita.
- Reconfirmaciones cercanas al horario de atención.
- Registro de mensajes entrantes.
- Seguimiento de mensajes enviados.
- Identificación de conversaciones que requieren atención humana.
- Enlaces seguros para reprogramar o cancelar.
- Cola de mensajes outbound para organizar envíos.

### 2.6 Arquitectura general en lenguaje de negocio

La plataforma está organizada en cinco capas funcionales:

| Capa | Qué resuelve |
| --- | --- |
| Canal de cliente | El cliente interactúa desde WhatsApp, enlaces móviles o web. |
| Experiencia de reserva | La mini app guía al cliente para elegir servicio, fecha, hora y datos. |
| Motor de agenda | Valida disponibilidad, bloqueos, conflictos y estados de citas. |
| Operación administrativa | El dueño gestiona agenda, clientes, servicios, mensajes y configuración. |
| Automatización | WhatsApp comunica confirmaciones, recordatorios, reconfirmaciones y seguimiento. |

### 2.7 Beneficios de negocio identificados

- Menos tiempo respondiendo manualmente mensajes repetitivos.
- Menor riesgo de citas duplicadas.
- Mayor control sobre citas pendientes y confirmadas.
- Mejor experiencia para clientes que prefieren resolver desde el celular.
- Historial claro de clientes, citas y conversaciones.
- Mayor probabilidad de asistencia gracias a recordatorios.
- Base digital lista para escalar a más sucursales, empleados y reportes.

---

## 3. Problemas comunes en negocios que trabajan por citas

Los negocios de servicios suelen operar con una combinación de WhatsApp, llamadas, notas, agenda física, Excel o memoria del equipo. Esto funciona al inicio, pero se vuelve frágil cuando aumenta el volumen de clientes.

Problemas frecuentes:

- Mensajes sin responder durante horas pico.
- Clientes preguntando repetidamente por disponibilidad.
- Doble reserva por falta de visibilidad.
- Cancelaciones avisadas tarde.
- Clientes que no recuerdan su cita.
- Dueños atendiendo, cobrando y administrando al mismo tiempo.
- Historial de clientes disperso en conversaciones.
- Recepcionistas dependiendo de procesos manuales.
- Falta de indicadores para saber cuántas citas se pierden.
- Dificultad para operar varias sucursales con el mismo estándar.

En negocios como salones de uñas, spas o consultorios, estos problemas impactan directamente en ingresos: una cita perdida no siempre se recupera, un horario vacío representa capacidad no vendida y una mala experiencia reduce la recompra.

---

## 4. Solución propuesta

La plataforma propone una operación digital simple:

1. El cliente solicita o gestiona su cita desde WhatsApp o un enlace móvil.
2. El sistema muestra servicios y horarios disponibles.
3. El cliente envía su solicitud.
4. El negocio aprueba, rechaza, reprograma o da seguimiento desde el dashboard.
5. WhatsApp automatiza confirmaciones y recordatorios.
6. El dueño tiene visibilidad de agenda, clientes, mensajes y pendientes.

El resultado es una operación más ordenada, medible y escalable, sin exigir al cliente descargar una app nativa ni aprender un sistema complejo.

---

## 5. Funcionalidades principales

### Agenda inteligente

- Vista de citas por día, semana y mes.
- Control de horarios disponibles.
- Bloqueos por descansos, eventos o indisponibilidad.
- Validación de conflictos.
- Estados claros de cada cita.

### Gestión de citas

- Solicitud de nuevas citas.
- Aprobación o rechazo por el negocio.
- Reprogramación.
- Cancelación.
- Confirmación.
- Registro de asistencia o finalización.

### Gestión de clientes

- Base de clientes centralizada.
- Historial de citas.
- Próxima cita visible.
- Identificación de clientes frecuentes.
- Métricas de cancelaciones, completadas y ausencias.

### Gestión de servicios

- Catálogo de servicios.
- Duraciones configurables.
- Servicios visibles para el cliente.
- Base preparada para precios, categorías y paquetes.

### Dashboard administrativo

- Resumen de operación diaria.
- Citas pendientes.
- Citas por estado.
- Acciones rápidas.
- Panel de mensajes.
- Acceso a disponibilidad, bloqueos y configuración.

### Web instalable

- El sistema puede instalarse desde navegadores compatibles.
- Permite una experiencia similar a app sin desarrollar una app nativa.
- Útil para dueños, recepcionistas y usuarios frecuentes.

---

## 6. Automatización mediante WhatsApp

WhatsApp es el canal natural para muchos negocios de servicios. La plataforma aprovecha ese comportamiento en lugar de forzar al cliente a cambiar de canal.

### Cómo funciona

El cliente puede iniciar una conversación, recibir un enlace de reserva o abrir una mini app desde WhatsApp. A partir de ahí, el flujo guía al cliente y registra la solicitud de cita en el sistema.

La operación se automatiza en puntos clave:

- Confirmación de solicitud.
- Notificación de aprobación.
- Recordatorio 24 horas antes.
- Reconfirmación 4 horas antes.
- Enlaces para reprogramar.
- Enlaces para cancelar.
- Registro de mensajes entrantes.
- Seguimiento de mensajes enviados.
- Alertas cuando se requiere atención humana.

### Carga operativa que reduce

El negocio deja de repetir manualmente mensajes como:

- "Qué horario tienes disponible?"
- "Me confirmas tu cita?"
- "Te recuerdo tu cita de mañana."
- "Quieres reagendar?"
- "Me pasas tu nombre y teléfono?"
- "Qué servicio necesitas?"

En vez de eso, el sistema guía al cliente y deja al equipo humano para lo que realmente requiere atención personalizada.

---

## 7. Mini App integrada

La mini app es una experiencia móvil pensada para clientes que vienen desde WhatsApp.

Permite:

- Elegir servicio.
- Consultar horarios.
- Enviar solicitud de cita.
- Reprogramar desde enlace seguro.
- Cancelar desde enlace seguro.
- Volver a WhatsApp al finalizar.

Su mayor ventaja comercial es que el cliente no necesita instalar una aplicación. El flujo se siente ligero, rápido y cercano al comportamiento actual del cliente.

Para una cadena de salones de uñas, esto permite que cada clienta pueda reservar o gestionar su cita desde el celular, sin llamar, sin esperar respuesta manual y sin depender de que la recepción esté disponible.

---

## 8. Dashboard administrativo

El dashboard es el centro operativo del dueño o equipo administrativo.

### Lo que permite controlar

- Citas del día.
- Solicitudes pendientes.
- Clientes registrados.
- Servicios disponibles.
- Bloqueos de agenda.
- Disponibilidad semanal.
- Mensajes enviados y recibidos.
- Conversaciones que requieren atención.
- Estados de confirmación y asistencia.

### Valor para el propietario

El dueño deja de operar a ciegas. Puede saber qué citas están pendientes, quién confirmó, qué cliente canceló, qué mensajes fallaron y qué horarios están disponibles.

Esto es especialmente importante cuando el negocio crece, porque la operación ya no depende únicamente de una persona que recuerda todo o revisa manualmente cada conversación.

---

## 9. Beneficios para el dueño

- Ahorro de tiempo administrativo.
- Menos mensajes repetitivos.
- Menos errores de agenda.
- Menos citas olvidadas.
- Mayor control de disponibilidad.
- Mejor seguimiento de clientes.
- Operación más profesional frente al cliente.
- Base de datos útil para ventas futuras.
- Mayor capacidad para escalar.
- Mejor visibilidad para tomar decisiones.

---

## 10. Beneficios para el cliente

- Puede solicitar cita desde su celular.
- Consulta disponibilidad sin esperar respuesta manual.
- Recibe confirmaciones y recordatorios.
- Puede reprogramar con menos fricción.
- Puede cancelar de forma clara.
- Tiene una experiencia más rápida y ordenada.
- Percibe al negocio como más profesional.

Una experiencia de reserva simple aumenta la probabilidad de que el cliente complete el proceso en el momento en que tiene intención de comprar.

---

## 11. Beneficios económicos

La plataforma impacta en tres áreas económicas:

### 11.1 Más ingresos protegidos

Cada cita confirmada y recordada tiene más probabilidad de completarse. Si el negocio reduce ausencias o cancelaciones tardías, protege horarios que antes podían perderse.

### 11.2 Menos costo operativo

El equipo dedica menos tiempo a coordinar manualmente horarios, enviar recordatorios y buscar información en conversaciones.

### 11.3 Mayor recompra

Con historial de clientes, recordatorios y comunicación ordenada, el negocio puede fomentar visitas recurrentes y construir relaciones más consistentes.

### Ejemplo de retorno

Si un salón evita entre 3 y 10 citas perdidas al mes, y cada cita representa un ticket promedio relevante, la plataforma puede pagarse sola. Además, si ahorra entre 30 y 60 horas mensuales de coordinación manual, libera tiempo para vender, atender mejor o crecer.

Estos números deben ajustarse al ticket promedio, volumen de citas y número de sucursales de cada negocio.

---

## 12. Escenarios de uso

### Salón de uñas con alta demanda

Una clienta escribe por WhatsApp para pedir cita. Recibe un enlace, elige servicio, fecha y hora. El salón aprueba la solicitud y el sistema envía recordatorio. La recepción ya no necesita revisar manualmente cada hueco disponible.

### Barbería con clientes recurrentes

El cliente agenda su corte, recibe confirmación y recordatorio. Si necesita cancelar, usa un enlace. El dueño mantiene visibilidad de agenda diaria y reduce espacios vacíos.

### Spa con servicios de mayor duración

El sistema ayuda a evitar empalmes entre tratamientos largos, bloquea horarios no disponibles y mejora la coordinación de citas especiales.

### Consultorio dental

El paciente recibe recordatorios y puede reprogramar con anticipación. El consultorio reduce llamadas manuales y mejora asistencia.

### Negocio multi-sucursal

La versión futura multi-sucursal permitiría ver operación por ubicación, comparar ocupación y estandarizar atención.

---

## 13. Casos de negocio

### Caso 1: Empresaria con varios salones de uñas

**Situación actual:** cada sucursal recibe mensajes por separado, el seguimiento depende de recepcionistas y hay poca visibilidad central.

**Con la plataforma:** cada salón puede operar citas con procesos estandarizados, recordatorios automáticos y control administrativo. La dueña puede avanzar hacia reportes consolidados y operación multi-sucursal.

**Impacto esperado:** menos citas perdidas, atención más rápida, mejor control de agenda y mayor capacidad de expansión.

### Caso 2: Barbería o estética independiente

**Situación actual:** el dueño atiende clientes y responde WhatsApp al mismo tiempo.

**Con la plataforma:** las reservas se ordenan, el cliente recibe recordatorios y el dueño revisa pendientes desde el dashboard.

**Impacto esperado:** menos interrupciones, menos errores y experiencia más profesional.

### Caso 3: Consultorio con citas programadas

**Situación actual:** muchas llamadas para confirmar y reagendar.

**Con la plataforma:** el sistema envía recordatorios, centraliza citas y permite gestionar cambios desde enlaces.

**Impacto esperado:** menor carga administrativa y mejor asistencia.

---

## 14. Modelo financiero

La plataforma puede venderse bajo tres modelos comerciales.

### 14.1 Venta única

El cliente paga una implementación inicial por adquirir o adaptar el sistema.

**Ejemplo de rango comercial:** MXN $45,000 a $120,000 según alcance, personalización, capacitación e integraciones.

**Ventajas:**

- Ingreso inicial alto.
- Atractivo para clientes que prefieren pagar una sola vez.
- Permite financiar personalizaciones.

**Desventajas:**

- Menor ingreso recurrente.
- Soporte y mantenimiento deben venderse aparte.
- Cada cliente puede pedir cambios distintos, aumentando complejidad.

### 14.2 SaaS mensual

El cliente paga una mensualidad por uso, soporte, actualizaciones y operación continua.

**Ventajas:**

- Ingreso recurrente y escalable.
- Barrera de entrada más baja para el cliente.
- Facilita actualizaciones constantes.
- Ideal para estandarizar producto.

**Desventajas:**

- Requiere soporte continuo.
- Existe riesgo de cancelación.
- El crecimiento depende de adquisición y retención de clientes.

### 14.3 Modelo híbrido

Combina pago inicial de configuración con mensualidad.

**Ejemplo:** MXN $15,000 a $50,000 de implementación + mensualidad según plan.

**Ventajas:**

- Cubre costos iniciales.
- Mantiene ingreso recurrente.
- Funciona bien para negocios que requieren capacitación o personalización.

**Desventajas:**

- Puede requerir más explicación comercial.
- Debe cuidarse que el pago inicial no frene la venta.

### 14.4 Planes sugeridos

| Plan | Perfil ideal | Incluye | Precio mensual sugerido |
| --- | --- | --- | --- |
| Básico | Negocio pequeño con una agenda | Reservas, agenda, clientes, servicios, recordatorios básicos y mini app | MXN $899 a $1,499 |
| Profesional | Salón, estética, barbería o consultorio con mayor volumen | Todo lo básico, dashboard completo, mensajes inbound/outbound, bloqueos, seguimiento y soporte prioritario | MXN $1,999 a $3,499 |
| Multi-sucursal | Cadena o negocio en expansión | Operación por sucursal, reportes consolidados, roles, automatización avanzada y acompañamiento | MXN $4,999 a $9,999+ |

Los precios deben ajustarse por volumen de citas, número de sucursales, número de usuarios, consumo de mensajes y nivel de soporte.

---

## 15. Automatización WhatsApp en detalle

### 15.1 Entrada del cliente

El cliente llega desde WhatsApp, un enlace compartido, una publicación o un botón de reserva. Desde ahí puede iniciar el flujo de cita.

### 15.2 Selección de servicio y horario

La mini app muestra servicios y horarios disponibles. Esto evita que el equipo tenga que revisar manualmente la agenda ante cada pregunta.

### 15.3 Solicitud y confirmación

El cliente envía la solicitud. El negocio puede aprobarla o gestionarla desde el dashboard. Una vez confirmada, WhatsApp comunica el estado al cliente.

### 15.4 Recordatorios

El sistema puede enviar recordatorios antes de la cita, por ejemplo 24 horas antes. Esto ayuda a que el cliente recuerde su compromiso y reduce inasistencias.

### 15.5 Reconfirmaciones

Horas antes de la cita, por ejemplo 4 horas antes, el sistema puede solicitar una reconfirmación. Esto permite identificar posibles ausencias con más tiempo.

### 15.6 Reprogramación y cancelación

El cliente puede recibir enlaces seguros para reprogramar o cancelar. Esto reduce el ida y vuelta de mensajes y permite liberar espacios con anticipación.

### 15.7 Atención humana

Cuando la conversación requiere intervención, el sistema permite identificar mensajes que necesitan atención. La automatización no reemplaza el trato humano: lo enfoca en los casos importantes.

---

## 16. Diferenciadores competitivos

### Frente a agenda en papel

- No se pierde información.
- Reduce errores de escritura.
- Permite consultar historial.
- Facilita recordatorios y confirmaciones.
- Da visibilidad desde cualquier dispositivo autorizado.

### Frente a Excel

- No requiere actualizar celdas manualmente.
- Evita conflictos por edición.
- Integra comunicación con clientes.
- Convierte la agenda en un flujo operativo, no solo una tabla.

### Frente a WhatsApp manual

- Ordena solicitudes.
- Evita olvidar mensajes.
- Automatiza recordatorios.
- Centraliza historial.
- Reduce tiempo de respuesta.

### Frente a Google Calendar

- Está diseñado para negocios de citas, no solo para eventos.
- Incluye flujo de cliente.
- Integra servicios, clientes, estados y mensajes.
- Permite seguimiento de solicitudes y confirmaciones.

### Frente a sistemas tradicionales de citas

- Se adapta al comportamiento real del cliente: WhatsApp y móvil.
- No exige app nativa.
- Combina mini app, dashboard y automatización.
- Está pensado para negocios locales que necesitan practicidad, no complejidad.

---

## 17. Ventajas competitivas de la plataforma

- Diseñada para negocios que viven de la agenda.
- Mobile-first para clientes y operación diaria.
- WhatsApp como canal central.
- Mini app sin instalación obligatoria.
- Dashboard para el dueño.
- Automatización de recordatorios y reconfirmaciones.
- Historial de mensajes y clientes.
- Base preparada para crecer a SaaS multi-negocio.
- Potencial de expansión hacia IA, pagos, reportes y multi-sucursal.

---

## 18. Futuras expansiones con IA

La plataforma puede evolucionar hacia un asistente inteligente para negocios de servicios.

Expansiones posibles:

- Asistente que responda preguntas frecuentes por WhatsApp.
- Recomendación de servicios según historial del cliente.
- Sugerencia automática de horarios óptimos.
- Detección de clientes en riesgo de no asistir.
- Campañas inteligentes para clientes inactivos.
- Predicción de demanda por día y horario.
- Resúmenes ejecutivos para dueños.
- Análisis de conversaciones para mejorar atención.

Estas funciones permitirían pasar de una plataforma de gestión a una plataforma de crecimiento comercial.

---

## 19. Recomendación comercial

Para vender el producto a una empresaria con varios salones de uñas, la propuesta debe enfocarse en tres mensajes:

1. **Orden operativo:** todas las citas, clientes y mensajes en un flujo controlado.
2. **Ahorro de tiempo:** menos coordinación manual por WhatsApp y menos carga para recepción.
3. **Más ingresos protegidos:** menos citas olvidadas, menos huecos perdidos y más seguimiento.

La recomendación es presentar una oferta híbrida:

- Implementación inicial para configuración, capacitación y adaptación al negocio.
- Mensualidad SaaS para soporte, mantenimiento, actualizaciones y automatización.
- Plan multi-sucursal como evolución natural cuando el negocio tenga varias ubicaciones activas.

---

## 20. Limitaciones actuales a comunicar con cuidado

Para mantener confianza comercial, conviene separar lo que ya está disponible de lo que forma parte del roadmap.

Disponible hoy:

- Gestión de citas.
- Agenda y disponibilidad.
- Dashboard propietario.
- Clientes.
- Servicios.
- Bloqueos.
- Mini app.
- WhatsApp operativo.
- Recordatorios y seguimiento.
- Web instalable.

Roadmap sugerido:

- Multi-sucursal completo.
- Agenda por empleado.
- Roles y permisos avanzados.
- Pagos y anticipos.
- IA conversacional.
- Reportes financieros avanzados.
- Campañas de marketing.

Esta claridad ayuda a vender sin sobreprometer y permite ofrecer fases de implementación.

---

## 21. Propuesta de cierre comercial

La plataforma no es solo una agenda digital. Es un sistema operativo para negocios que dependen de citas.

Ayuda a que el negocio atienda mejor, pierda menos tiempo, reduzca errores, mantenga comunicación constante con sus clientes y tenga una base digital para crecer.

Para salones de uñas, barberías, estéticas, spas y consultorios, el valor principal está en transformar una operación manual y dispersa en un proceso profesional, automatizado y medible.

---

## 22. Sección técnica opcional para anexar

Esta sección puede omitirse en propuestas comerciales iniciales.

La solución opera como aplicación web instalable, con un panel administrativo, una mini app móvil para clientes, una capa de agenda y disponibilidad, una base de datos centralizada y una integración con WhatsApp Cloud API para mensajería automatizada.

El diseño permite evolucionar hacia un modelo SaaS con múltiples negocios, sucursales, usuarios, reportes e integraciones adicionales.

---

## 23. Checklist para exportar a PDF

Antes de enviar al prospecto:

- Personalizar portada con nombre del prospecto.
- Agregar logo propio o marca comercial.
- Ajustar precios al tamaño del negocio.
- Incluir 2 o 3 capturas reales del dashboard y mini app.
- Adaptar ejemplos al giro: uñas, barbería, spa, consultorio o estética.
- Definir si la oferta será venta única, SaaS o híbrida.
- Separar claramente implementación inicial y mensualidad.
- Incluir siguiente paso comercial: demo, piloto o diagnóstico.
