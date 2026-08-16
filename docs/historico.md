# Histórico de cambios - AMETIS Platform

Este documento registra los cambios relevantes realizados sobre `ametis-platform`.

> Regla de trabajo: cada ajuste funcional, arquitectónico o de infraestructura debe añadir una entrada nueva en este histórico antes de cerrar la tarea.

## 2026-08-13 - Agent Factory / Fábrica de agentes

### Contexto

Se evolucionó la plataforma para incorporar una aplicación independiente llamada **Agent Factory**, responsable de preparar la documentación, bases de conocimiento y definición inicial de agentes por workspace.

La intención arquitectónica es que `ametis-platform` sea dueño de:

- autenticación y sesión;
- workspace/tenant activo;
- gestión documental;
- definición funcional del agente;
- asociación entre agente y bases de conocimiento;
- publicación de la configuración hacia `ametis-ai`.

`ametis-ai` queda como responsable de:

- ingesta documental;
- chunking;
- embeddings;
- almacenamiento vectorial;
- recuperación RAG;
- ejecución futura del agente.

### Autenticación y experiencia base

- Se integró Agent Factory con Keycloak mediante OIDC Authorization Code + PKCE.
- Se eliminó el uso del cliente confidencial `core-api` desde el frontend.
- Se configuró el cliente público `agent-factory-web`.
- Se creó una experiencia visual coherente con AMETIS para login, callback y shell de aplicación.
- Se añadieron soporte de idioma y tema siguiendo el patrón de AMETIS Platform.
- Se eliminó texto visible hardcodeado y se movió a catálogos i18n `es` y `en`.
- Se añadió `.editorconfig` para forzar `UTF-8` y evitar problemas con tildes y caracteres especiales.

### Repositorio documental

- Se implementó conexión de Google Drive por usuario mediante OAuth.
- Se dejó disponible el modo legacy con service account para raíces ubicadas en Google Shared Drive.
- Se creó el concepto de namespace documental por workspace.
- El usuario puede editar la parte legible del namespace; el identificador técnico del tenant no es editable.
- Al preparar el repositorio se crea/reutiliza la estructura:

```text
{namespace}/
└── docs/
```

- Se implementó subida, listado, descarga, eliminación y refresco manual de documentos.
- Se validan formatos soportados antes de subir documentos.
- Se gestionaron errores de Drive, CORS, cuotas y archivos no soportados.

### Bases de conocimiento

- Se añadió la fase **Bases de conocimiento**.
- Se crearon tablas y API para definir bases por tenant.
- Una base de conocimiento puede agrupar documentos ya almacenados.
- La fase queda preparada para indexación posterior en `ametis-ai`, pero no indexa por sí misma.

### Agentes

- Se añadió la fase **Agentes**.
- Se crearon tablas y API para definir agentes por tenant.
- Cada agente contiene:
  - nombre;
  - descripción;
  - instrucciones;
  - estado;
  - bases de conocimiento asociadas.
- Se añadió publicación MVP:
  - `DRAFT` -> `READY`;
  - `published_at`;
  - validación de que exista al menos una base asociada.

### Integración inicial con AMETIS AI

- Se añadió cliente opcional hacia el RAG service de `ametis-ai`.
- La integración se activa solo si existe:

```env
AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL=
```

- Si la variable está configurada, al publicar un agente Agent Factory llama por cada base asociada a:

```text
POST {AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL}/tenants/{namespace}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/ingest
```

- Contrato actual:
  - `tenant_id` en `ametis-ai` = namespace documental del workspace;
  - `agent_id` = UUID del agente en Agent Factory;
  - `knowledge_base_id` = UUID de la base de conocimiento en Agent Factory.

### Infraestructura

- Se añadió `agent-factory-app` como servicio backend Spring Boot.
- Se añadió `agent-factory-web` como frontend independiente en Next.js.
- Se añadieron rutas Kong bajo `/api/agent-factory`.
- Se añadieron variables de entorno para Google OAuth, CORS y publicación hacia AMETIS AI.
- Se validaron builds Docker y migraciones Flyway hasta `V5`.

### Validaciones realizadas

- TypeScript `tsc --noEmit`.
- ESLint.
- Validación JSON de catálogos i18n.
- Tests Maven del backend en contenedor.
- Build Docker de backend y frontend.
- Recreación de servicios locales.
- Verificación de CORS para endpoints de Agent Factory.
- Verificación de aplicación de Flyway.

### Pendiente inmediato

- Crear endpoint real de sincronización de ficha completa en `ametis-ai`, por ejemplo `POST /agents/sync`.
- Enviar desde Platform nombre, descripción, instrucciones y bases asociadas.
- Persistir la ficha sincronizada en la base propia de `ametis-ai`.
- Separar publicación de agente e indexación documental si el flujo operativo lo requiere.

## 2026-08-14 - Preparación de migración PostgreSQL hacia VPS

### Decisión

Se decidió usar como objetivo la instancia PostgreSQL existente en el VPS que ya utilizaba `ametis-ai`, en lugar de mantener dos instancias separadas para producción.

El patrón recomendado queda:

```text
PostgreSQL VPS compartido
├── keycloak_db
├── core_db
├── agent_factory_db
└── ametis_ai_db
```

`newsletter_db` queda explícitamente fuera de esta migración.

### Script preparado

Se añadió:

```text
scripts/migrate-platform-data-to-vps-postgres.ps1
```

El script exporta desde el Postgres local de Platform solo:

- `keycloak_db`;
- `core_db`;
- `agent_factory_db`.

Y excluye expresamente:

- `newsletter_db`.

### Pendiente para ejecutar

Para aplicar la migración se necesitan los datos reales del Postgres del VPS:

- host;
- puerto;
- usuario administrador o con permisos de creación;
- contraseña;
- confirmación de si se permite sobrescribir bases existentes.

### Ejecución realizada

Se validó conexión al PostgreSQL del VPS en `13.140.179.140:5432` usando el usuario operativo existente de `ametis-ai`.

El usuario remoto tiene permisos suficientes de administración (`SUPERUSER`, `CREATEDB`, `CREATEROLE`).

Se migraron correctamente las bases:

- `keycloak_db`;
- `core_db`;
- `agent_factory_db`.

No se creó ni migró:

- `newsletter_db`.

Verificación posterior en VPS:

- `agent_factory_db` contiene las tablas de documentos, repositorios, bases de conocimiento y agentes.
- `core_db` contiene las tablas del esquema `core`.
- `keycloak_db` contiene las tablas de Keycloak.
- La lista de bases del VPS no incluye `newsletter_db`.

### Reconfiguración local de servicios

Se parametrizaron las conexiones de `infra/docker-compose.yml` para que Core API y Keycloak puedan apuntar a una base externa mediante variables de entorno.

Se configuraron localmente estos servicios contra el PostgreSQL del VPS:

- `keycloak` -> `keycloak_db`;
- `core-api` -> `core_db`;
- `agent-factory-app` -> `agent_factory_db`.

No se modificó la conexión de Newsletter. `newsletter-app` sigue usando su configuración local/default y queda fuera de este alcance.

Se recrearon únicamente:

- `ametis-keycloak`;
- `ametis-core-api`;
- `ametis-agent-factory-app`.

Verificación:

- Keycloak responde correctamente en el realm `ametis`.
- Agent Factory conecta a `agent_factory_db` remoto y Flyway valida versión `5`.
- Core API abre conexión JDBC contra `core_db` remoto.

## 2026-08-16 - Desactivación temporal de Newsletter en la versión activa

### Decisión

Se decidió retirar `newsletter-app` y `newsletter-web` del stack activo de `ametis-platform` para esta versión, sin borrar el código ni el historial del producto.

La razón es funcional y de enfoque: esta rama/versión está centrada en `Agent Factory`, `Core API`, Keycloak y la plataforma de gestión documental y agentes, y no se va a desplegar la funcionalidad de newsletter en este ciclo.

### Estado archivado

Se conserva el producto en el repositorio y en la documentación, pero queda fuera del despliegue activo. Esto incluye:

- `apps/newsletter-app`
- `frontend/newsletter-app`
- la composición de `newsletter` en infra
- referencias de entorno y rutas de integración previas

### Regla de recuperación

Si en el futuro se desea retomar la funcionalidad, se puede volver a reactivar el stack de newsletter con la misma base de código, la misma configuración y la misma separación de responsabilidades que existía antes de esta desactivación.

### Registro de mantenimiento

- Se eliminó del stack activo la dependencia a `newsletter_db`.
- Se eliminó la dependencia a `postgres` local para `agent-factory` y se dejó el uso del PostgreSQL externo del VPS.
- Se dejó la decisión documentada para que el producto pueda recuperarse sin perder contexto ni trabajo previo.

## 2026-08-14 - Agent Factory / Sincronización con AMETIS AI

### Publicación de agentes

Se conectó la acción de publicación de Agent Factory con `ametis-ai` para que la definición funcional del agente quede sincronizada antes de solicitar la ingesta RAG.

Flujo actual:

1. Agent Factory valida el agente y sus bases de conocimiento.
2. Marca el agente como `READY`.
3. Envía a `ametis-ai` la definición del agente mediante:

```text
POST {AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL}/agents/sync
```

4. Solicita la ingesta de cada base de conocimiento asociada mediante:

```text
POST {AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL}/tenants/{namespace}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/ingest
```

Payload sincronizado hacia `ametis-ai`:

- namespace documental del tenant;
- identificador del tenant/workspace de Platform;
- identificador del agente;
- nombre, descripción e instrucciones;
- estado de publicación;
- fechas de publicación y actualización;
- bases de conocimiento asociadas;
- cantidad de documentos por base.

### Configuración local

Para desarrollo local con `ametis-ai` ejecutándose fuera del contenedor de Platform, se configuró:

```text
AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL=http://host.docker.internal:8000
```

Verificación:

- `agent-factory-app` levanta correctamente contra `agent_factory_db` en el PostgreSQL del VPS.
- `agent-factory-app` tiene configurada la URL `http://host.docker.internal:8000`.
- Desde Docker se alcanza correctamente el healthcheck de `ametis-ai` en `/health`.

## 2026-08-14 - Agent Factory / Edición de agentes

### Gestión de agentes

Se añadió la capacidad de editar agentes ya creados desde la fase **Agentes**.

Comportamiento:

- cada agente del inventario muestra una acción de edición;
- al editar, el formulario carga nombre, descripción, instrucciones y bases de conocimiento asociadas;
- el usuario puede cancelar la edición y volver al modo creación;
- al guardar, se usa el endpoint existente `PATCH /api/agent-factory/agents/{agentId}`;
- si se edita un agente publicado, el backend lo devuelve a estado `DRAFT` para obligar a republicar los cambios.

También se amplió la respuesta de agentes para incluir `knowledgeBaseIds`, necesarios para precargar correctamente las bases seleccionadas en el formulario.

Validación:

- tests Maven de `agent-factory-app` ejecutados correctamente;
- typecheck del frontend `agent-factory-app` ejecutado correctamente.

## 2026-08-14 - Agent Factory / Publicación desacoplada de ingesta

### Ajuste operativo

Se corrigió el flujo de publicación para que no espere de forma síncrona la ingesta documental de `ametis-ai`.

Motivo:

- la sincronización del agente con `POST /agents/sync` es rápida;
- la ingesta documental puede tardar decenas de segundos o minutos;
- mantener ambas operaciones en la misma petición HTTP puede provocar timeouts y dejar `ametis-platform` en `DRAFT` aunque `ametis-ai` haya recibido datos o incluso indexado documentos.

Nuevo comportamiento:

- **Publicar** marca el agente como `READY`;
- sincroniza nombre, descripción, instrucciones, estado y bases asociadas con `ametis-ai`;
- no ejecuta la ingesta documental en la misma petición;
- la ingesta queda reservada para un pipeline/job de indexación posterior.

También se corrigió la edición de agentes para forzar `flush()` tras borrar asociaciones agente/base antes de reinsertarlas, evitando conflictos con la constraint única cuando se guarda un agente manteniendo la misma base de conocimiento.

## 2026-08-14 - Agent Factory / Solicitud de indexación controlada por usuario

### Flujo

Se añadió una acción explícita para que el usuario solicite la indexación del conocimiento de un agente publicado.

Nuevo comportamiento en la fase **Agentes**:

- el usuario publica el agente;
- Platform sincroniza la definición del agente con `ametis-ai`;
- para agentes `READY`, se muestra la acción **Indexar conocimiento**;
- al pulsarla, Platform solicita a `ametis-ai` la creación de jobs de indexación;
- la UI muestra el último estado conocido: sin indexar, pendiente, procesando, completado o fallido;
- si hay jobs pendientes/procesando, la UI consulta estado cada 5 segundos.

### Contrato interno con AMETIS AI

Platform usa:

```text
POST /agents/{agentId}/indexing-jobs
GET  /tenants/{tenantId}/agents/{agentId}/indexing-jobs/latest
```

Platform no escribe directamente en `ametis_ai_db` y no interactúa con Qdrant. Mantiene el límite de responsabilidad:

- `ametis-platform` solicita y muestra estado;
- `ametis-ai` ejecuta la indexación y escribe en Qdrant.

### Validación

- `agent-factory-app` compila correctamente.
- `agent-factory-web` pasa typecheck y build.
- Los contenedores `ametis-agent-factory-app` y `ametis-agent-factory-web` fueron recreados correctamente.

## 2026-08-14 - Agent Factory / Prueba funcional del agente

### Objetivo

Se añadió una validación funcional para que el usuario no dependa solo de estados técnicos de indexación.

Nuevo comportamiento:

- cuando un agente está `READY` y su conocimiento tiene una indexación completada, la tarjeta muestra **Agente listo para probar**;
- se indica cuántos documentos quedaron preparados para ese agente;
- se muestra un panel **Probar agente**;
- el usuario puede hacer una pregunta de prueba desde la propia tarjeta;
- Platform envía la consulta a `ametis-ai` usando el endpoint RAG de la primera base asociada;
- la respuesta se muestra dentro de la tarjeta.

### Contrato interno

Se añadió en Platform:

```text
POST /api/agent-factory/agents/{agentId}/test
```

Este endpoint actúa como proxy seguro hacia:

```text
POST /tenants/{tenantId}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/query
```

### Validación

- `agent-factory-app` compila correctamente.
- `agent-factory-web` pasa typecheck y build.
- Se probó una consulta RAG real contra `ametis-ai` para el agente `9edacd31-62cf-4afc-afaa-f9076682210d`.

## 2026-08-14 - Agent Factory / Limpieza de documentos en bases

### Problema

Al eliminar un documento, el asset quedaba marcado como `DELETED`, pero las bases de conocimiento podían seguir mostrando la asociación histórica hacia ese documento.

### Ajuste

Se corrigió el backend para:

- eliminar las asociaciones `knowledge_base_documents` cuando se borra un documento desde Platform;
- ignorar documentos que no estén en estado `STORED` al listar bases de conocimiento;
- limpiar automáticamente enlaces obsoletos al consultar las bases.

También se limpió la asociación obsoleta existente en `agent_factory_db`, dejando `aeme-test` con `0` documentos asociados.

## 2026-08-15 - Agent Factory / Renovación silenciosa de sesión

### Problema

La aplicación cerraba la sesión cuando el `access_token` expiraba, aunque el usuario siguiera autenticado y existiera `refresh_token` disponible.

### Ajuste

Se corrigió el frontend de Agent Factory para:

- centralizar el almacenamiento de `access_token` y `refresh_token`;
- renovar la sesión contra `core-api` usando `POST /v1/auth/refresh`;
- refrescar el token antes de llamadas API si está próximo a expirar;
- reintentar una vez las operaciones que devuelvan `401`;
- evitar que `SessionGuard` redirija a login sin intentar primero la renovación silenciosa.

### Validación

- `agent-factory-web` pasa `npm run typecheck`.

## 2026-08-15 - Agent Factory / Estado claro de indexación

### Problema

El usuario podía volver a pulsar **Indexar conocimiento** aunque el agente ya tuviera conocimiento indexado para la última publicación. Esto hacía confusa la experiencia porque no quedaba claro si había cambios pendientes o si el índice ya estaba actualizado.

### Ajuste

Se actualizó la vista de agentes para:

- refrescar el estado del job justo después de solicitar la indexación desde el botón;
- considerar el conocimiento actualizado cuando todos los jobs completados terminaron después de la última publicación del agente;
- mostrar **Conocimiento indexado** y deshabilitar el botón cuando no hay cambios pendientes;
- mantener el botón activo cuando el agente está publicado pero todavía no tiene indexación válida.

### Validación

- `agent-factory-web` pasa `npm run typecheck`.
- `agent-factory-web` compila correctamente y fue recreado.

## 2026-08-15 - Agent Factory / Polling automático de indexación

### Problema

Después de pulsar **Indexar conocimiento**, la indexación podía completarse en `ametis-ai`, pero la vista de agentes no siempre reflejaba el nuevo estado hasta refrescar manualmente la página.

### Ajuste

Se cambió la vista de agentes para mantener una lista explícita de agentes bajo observación tras solicitar indexación. Mientras un agente esté siendo observado, la UI consulta el estado cada 2,5 segundos y deja de hacerlo cuando confirma que el conocimiento está actualizado para la última publicación.

### Validación

- `agent-factory-web` pasa `npm run typecheck`.
- `agent-factory-web` compila correctamente y fue recreado.

## 2026-08-15 - Agent Factory / Confirmación antes de eliminar

### Problema

Las opciones de eliminar en bases de conocimiento y agentes ejecutaban la acción directamente, aumentando el riesgo de borrado accidental.

### Ajuste

Se añadió un modal de confirmación para todas las eliminaciones principales de Agent Factory:

- documentos;
- bases de conocimiento;
- agentes.

Los textos usan i18n y explican el alcance de cada borrado antes de confirmar.

### Validación

- `agent-factory-web` pasa `npm run typecheck`.
- `agent-factory-web` compila correctamente y fue recreado.

## 2026-08-15 - Core API / Refresh token por cliente OIDC

### Problema

Agent Factory iniciaba sesión con el cliente público `agent-factory-web`, pero `core-api` intentaba renovar el `refresh_token` usando el cliente confidencial `core-api`. Keycloak rechazaba la renovación con:

```text
Token client and authorized client don't match
```

El efecto visible era que, tras esperar un rato, al ejecutar acciones protegidas como **Publicar**, la aplicación expulsaba al usuario de la sesión.

### Ajuste

Se actualizó el contrato de `POST /v1/auth/refresh` para aceptar opcionalmente `clientId`.

- Si no se envía `clientId`, mantiene compatibilidad con el flujo clásico de `core-api`.
- Si se envía un cliente público permitido, renueva usando ese cliente y sin `client_secret`.
- Agent Factory envía `agent-factory-web` al renovar sesión.

### Validación

- `core-api` pasa `mvn test` en Docker.
- `agent-factory-web` pasa `npm run typecheck`.
- `core-api` y `agent-factory-web` compilan correctamente y fueron recreados.

## 2026-08-15 - Agent Factory / Mejoras UX en agentes

### Ajustes

Se mejoró la pantalla de agentes para:

- mostrar una tarjeta de progreso mientras AMETIS AI indexa documentos en segundo plano;
- permitir enviar preguntas de prueba con la tecla Enter;
- limpiar el campo de pregunta cuando se recibe una respuesta del agente.

### Validación

- `agent-factory-web` pasa `npm run typecheck`.
- `agent-factory-web` compila correctamente y fue recreado.
