# Histórico de cambios - AMETIS Platform

## 2026-09-06 - Widget de chat: verificado, seguro por defecto y personalizable

### Verificación end-to-end

El widget (`frontend/ametis-widget/`) se probó en local (`demo.html` + `node
serve.js`) contra un despliegue `WEB_CHAT` real: carga el mensaje de bienvenida,
responde con el RAG, muestra chips de sugerencias y los puntos de carga.
`PublicWidgetController` sirve el bundle en `/api/agent-factory/public/widget.js`.

### Origen seguro por defecto

`DeploymentOrigins.isAllowed`: lista vacía → **403** (antes permitía todo). Un
despliegue `WEB_CHAT` no responde hasta que se declaran sus orígenes
(`esquema://host[:puerto]`, sin ruta). Endurecimiento adicional (rate limiting,
Turnstile, token de sesión, api key) **pospuesto a propósito** — plan por pasos
en `.agents/current-state.md`.

### Personalización por despliegue (V17) — página propia con preview en vivo

`V17__deployment_web_chat_style.sql` añade a `agent_deployments`:
`theme_primary_color`, `theme_font` (clave: `system|humanist|serif|mono`),
`theme_position` (`bottom-right`/`bottom-left`), `theme_title`, `theme_subtitle`.
**Sin avatar** (espera a MinIO). Todo opcional.

- **Pantalla propia** `/deployments/[id]/appearance` (no el formulario de alta):
  muestras de color + selector, desplegable de tipografía (stacks del sistema,
  **sin Google Fonts**), posición, título, subtítulo. Endpoint dedicado
  `PUT /deployments/{id}/appearance` (`DeploymentTheme`). Botón "Apariencia" en
  cada tarjeta `WEB_CHAT`.
- **Previsualización en vivo**: un `<iframe>` con el widget real en **modo
  preview** (`data-preview="1"` → no llama al backend, recibe el tema por
  `postMessage`). Toggle escritorio/móvil. Cada cambio se refleja al instante.
- El objeto `theme` viaja en `GET /public/{publicId}`; el widget lo aplica.

### Validación

- `agent-factory-app` compila (`mvn compile` en Docker).
- `agent-factory-web` pasa `tsc` + `next build` (ruta `/deployments/[id]/appearance`).
- Widget: `tsc` + build (13.5 KB, incluye modo preview).
- Rebuild necesario: `agent-factory-app` (migración V17 + endpoints) + `agent-factory-web`.

## 2026-09-04 - Login solo SSO; fix de perfil desactualizado en la barra superior

### Fix: "Usuario AMETIS" en vez del nombre real

`components/app-shell.tsx` leía el nombre del usuario del token **solo al montar**
el componente (`useEffect(..., [])`). Como el login navega dentro de la misma app
sin recargar, a veces esa lectura ocurría antes de guardar el token nuevo y nunca
se repetía. Verificado con el flujo SSO completo (PKCE real contra Keycloak): el
token siempre trae `name`/`given_name`/`family_name` correctos — no era un
problema de Keycloak. Fix: el efecto ahora depende de `pathname`, se reevalúa en
cada cambio de ruta.

### Login solo SSO

Se retira el formulario de correo/contraseña de `/auth/login`: la única acción es
"Acceder con AMETIS" (SSO, Authorization Code + PKCE). Motivo: un solo punto de
identidad (MFA, recuperación de contraseña, login social se activan en Keycloak
sin tocar el frontend), la contraseña nunca pasa por `core-api`, y menos código
que mantener. `/auth/register` se mantiene igual (crea el usuario + aprovisiona
el workspace) y sigue haciendo un login automático por contraseña una sola vez
justo después de registrarse, antes de entrar a `/onboarding`. Claves i18n
`login.emailLabel/passwordLabel/signInAction/signingIn/orDivider` eliminadas por
no usarse ya.

## 2026-09-04 - Decisión: almacenamiento documental a MinIO (Drive conmutable)

### Contexto

El modo `service-account` de Drive no permite **subir** archivos (la cuenta de
servicio no tiene cuota; solo crea carpetas). Sumado al OAuth, expiración de
token a 7 días, verificación de app y listado eventualmente consistente, se
decide mover el almacenamiento documental a **MinIO** (object storage), con
**bucket por tenant**.

### Decisión

- MinIO pasa a ser el backend por defecto. El **código de Drive se conserva** y
  el backend se vuelve conmutable por configuración (`AGENT_FACTORY_STORAGE_PROVIDER`,
  global ahora; por tenant + UI de admin más adelante).
- Sub-decisiones cerradas: bucket por tenant · renombrar columnas de storage a
  nombres neutrales · sin migración de datos (se recrean) · key `{uuid}__{nombre}`
  · borrado duro con confirmación obligatoria.
- Especificación completa: `.agents/proposals/minio-storage-migration.md`.
  Decisión en `.agents/decisions.md`.

### Estado

**Pausado.** Primero se saca una versión con el flujo de Drive por tenant que ya
funcionaba (`AGENT_FACTORY_GOOGLE_AUTH_MODE=workspace-oauth`, el owner conecta su
propio Google Drive por OAuth). MinIO se implementa justo después. El código
`MANAGED` añadido a `GoogleDriveOAuthService` queda inerte en modo
`workspace-oauth` y se conserva para el trabajo de MinIO.

## 2026-08-30 - Alta autoservicio de cuenta + workspace + onboarding de negocio

### Contexto

El acceso a Agent Factory era solo SSO (redirect a Keycloak) y asumía que el
tenant/workspace y su "Negocio principal" ya existían (creados a mano o por la
migración V13). Un usuario nuevo no podía crear su propia cuenta ni su espacio de
trabajo, y un tenant recién creado se quedaba atascado en `error.businessMissing`.

### Cambios

**Core (`core-api`)**
- `application.yml`: nueva sección `core.registration` con
  `default-product-code: ${CORE_REGISTRATION_DEFAULT_PRODUCT_CODE:agent-factory}`
  (antes el `@Value` caía a `newsletter`, dejando al usuario sin acceso a Agent
  Factory). El producto `agent-factory`, permisos y `plan_features` ya estaban
  sembrados en `db/migrations/V4__agent_factory_product.sql`.
- Sin cambios de código: `POST /v1/auth/register` ya crea usuario en Keycloak +
  perfil en Core y `RegistrationProvisioningService.provisionInitialWorkspace()`
  crea el tenant con rol OWNER y concede acceso al producto por defecto.
- Requiere en Keycloak: cliente `core-api` con **Direct Access Grants** activado
  (lo usa `POST /v1/auth/login`, grant `password`).

**Frontend `agent-factory-app`**
- `/auth/login`: formulario email/contraseña como acción principal (`POST
  /v1/auth/login`), enlace "Crear cuenta", y "Continuar con AMETIS" (SSO) como
  alternativa secundaria.
- `/auth/register` (nueva): nombre + email + contraseña → `registerAccount()` →
  `loginWithPassword()` → `/onboarding`.
- `/onboarding` (nueva): si el tenant ya tiene negocio redirige al panel; si no,
  pide el nombre del negocio, lo crea y entra. Se renderiza fuera del AppShell.
- `lib/session.ts`: `getAuthMode()/setAuthMode()` (`sso` | `password`).
- `lib/auth-client.ts`: `registerAccount`, `loginWithPassword`; `refreshSession`
  solo envía `clientId: agent-factory-web` en modo `sso` (las sesiones
  `password` se emiten para el cliente confidencial de Core y se refrescan sin
  `clientId`).
- `lib/agent-factory-api.ts`: `authenticatedFetch` redirige a `/onboarding` ante
  `error.workspaceMissing` / `error.businessMissing`.

### Decisiones (marcadas por el usuario)

- v1: **un solo workspace por usuario** (sin selector de workspace todavía).
- Creación del negocio inicial mediante **paso de onboarding guiado**, no
  automático.
- Registro con **formulario propio** en la app (patrón estándar: pantalla de
  acceso con enlace a registro).

### Correcciones posteriores (mismo día)

- `core-api` y `keycloak` estaban caídos: se habían recreado sin `--env-file`, con
  el placeholder `jdbc:postgresql://vps-postgres-host:...` sin resolver. Se
  recrearon con `--env-file .env.local` (BD local `ametis-postgres`, datos
  intactos). **Levantar siempre con `scripts/up-platform.ps1` o el mismo juego de
  flags**, nunca `docker compose ... up` suelto.
- `infra/platform-stack.compose.yml`: los build-args `NEXT_PUBLIC_*` de
  `agent-factory-web` apuntaban a `http://localhost:8000` (rag-service) por
  defecto; corregidos a `http://localhost:8440` (Kong).
- Registro daba 401 en el login automático: el formulario pedía "Nombre completo"
  en un campo; con un solo nombre, `lastName` quedaba vacío → Keycloak marca
  `VERIFY_PROFILE` → "Account is not fully set up" → *password grant* rechazado.
  Fix: `AuthService.createIdentityUser` rellena `lastName` con `firstName` si
  queda vacío; el formulario ahora tiene campos separados **Nombre** / **Apellidos**.
- Campos obligatorios en `/auth/register`, `/auth/login` y `/onboarding`: marca
  `*`, `required`/`aria-required`, nota "campos obligatorios", borde `:user-invalid`.
- **Drive gestionado por AEME (sin conectar nada el usuario nuevo)**:
  `AGENT_FACTORY_GOOGLE_AUTH_MODE` pasa de `workspace-oauth` a `service-account`
  en `.env` y `.env.local` (el `oauth-user` refresh-token estaba vacío; el JSON de
  cuenta de servicio `ametis-rag-drive-document-repo@aeme-dev.iam...` sí existe y
  tiene `canAddChildren` sobre la carpeta raíz local `AMETIS_LOCAL_DOCS`).
  `GoogleDriveOAuthService.status()` devuelve `MANAGED` cuando el
  modo es `oauth-user`/`service-account` con credenciales presentes; `authorize()`
  responde 409 `error.driveManaged`. El dashboard: si el estado es `MANAGED`
  oculta "Conectar Drive" y **auto-provisiona el repositorio del tenant** en la
  carga (`provisionRepository()` sin namespace → el backend lo deriva del slug del
  tenant); solo queda un botón de reintento si esa provisión falla.

### Pendiente

- Keycloak: verificación de email y recuperación de contraseña.
- Selector de workspace + "crear workspace" adicional (cuando se necesite
  multi-workspace por usuario).
- Cuentas de prueba con `lastName` vacío creadas antes del fix siguen sin poder
  iniciar sesión (borrar en Keycloak+Core o parchear el apellido).

### Validación

- `agent-factory-web` pasa `npx tsc --noEmit`; JSON de locales válido.
- Rebuild necesario: `core-api` + `agent-factory-web`.

## 2026-08-30 - Modelo multi-cliente (Negocios), aislamiento fuerte y jerarquía documental

### Contexto

Agent Factory era plano bajo `tenant_id`: no se podía asociar un agente a un negocio y los documentos de todos los negocios de un tenant se mezclaban. Objetivo: modelo de agencia (un tenant = consultor/agencia, un negocio = cliente final) con aislamiento real entre negocios, e incluso entre agentes del mismo negocio.

### Ajuste (una sola sesión larga, sin commitear todavía)

- **Módulo de despliegue completado**: `V8` (mensaje de bienvenida, límites por minuto/día), `V9` (`allowed_origins`), `V10/V11` (`public_id` opaco de 32 hex, sin prefijo, regenerable). Endpoint público `GET|POST /api/agent-factory/public/{publicId}[/query]` (`PublicDeploymentController`), solo canal `WEB_CHAT`, valida cabecera `Origin` contra `allowed_origins`, sin JWT. `DeploymentResponse` devuelve `endpointUrl`/`queryUrl`/`embedSnippet` derivados. `AGENT_FACTORY_PUBLIC_BASE_URL` nuevo. Falta el bundle `ametis-widget.js` y la seguridad de consumo por api key / rate limit.
- **Perfil de contexto del agente -> RAG**: `publish` sincroniza persona/audiencia/tono/idioma; el RAG los inyecta en el prompt.
- **Negocios**: `V12` tabla `businesses`; `V13` `business_id` en `agents` y `knowledge_bases` + backfill "Negocio principal". Cabecera `X-Business-Id` (`BusinessContextFilter`), selector en la topbar, página `/businesses`. Unicidad de nombre pasa a `(business_id, name)`.
- **Documentos por negocio y luego por base de conocimiento**: `V14` (carpeta Drive del negocio + `document_assets.business_id`), `V15` (carpeta Drive por base + `document_assets.knowledge_base_id`, se **elimina** `knowledge_base_documents`). Jerarquía Drive: `{namespace}/{negocio-slug}/{base-slug--8hex}/`. La gestión de documentos se mueve del dashboard a `/knowledge-bases/{id}/documents`. El dashboard queda solo con conexión Drive + repositorio; el campo namespace se rellena con el slug del negocio activo.
- **Aislamiento fuerte**: `business_id` es filtro `must` obligatorio en el retrieval del RAG y se estampa en cada chunk (contrato platform->RAG en `syncAgent` / `createIndexingJobs` / `query`). Cada job de indexado usa la carpeta de su base.
- **Opción A** (la plataforma pasa el id de carpeta de Drive al RAG, en vez de que este la busque por nombre): elimina el fallo intermitente "carpeta no encontrada" al indexar.
- `rag-service` local pasa a usar el Postgres local (`ametis_postgres`) en vez del de la VPS.

### Pendiente

- **Re-indexar todos los agentes** tras desplegar (los chunks viejos no tienen `business_id`).
- Publicar la app OAuth de Google a producción (quita la caducidad de 7 días del token).
- Seguridad de consumo del despliegue más allá del origen; bundle del widget.
- Nada commiteado — hacer commit antes de cualquier reinicio de contexto.

## 2026-08-29 - Runbooks / Reinicio aislado de servicios Docker

### Contexto

Al levantar `core-api`, `kong` o `agent-factory-app` con `docker compose up`, Compose seguia las dependencias declaradas en los archivos del stack y podia intentar arrancar o recrear servicios que ya estaban levantados, especialmente Keycloak.

### Ajuste

- `.agents/runbooks.md` documenta el uso de `--no-deps` para refrescar un servicio sin tocar sus dependencias.
- Se agregaron comandos locales desde Windows para reiniciar solo `core-api`, solo `kong` o solo Agent Factory.
- Se dejo aclarado que `platform-stack.compose.yml` depende del compose base para resolver servicios como `keycloak`; para ejecuciones sueltas se puede usar `infra/compose/agent-factory-app.compose.yml`.

## 2026-08-28 - Agent Factory / Inventario de agentes colapsable

### Contexto

La vista de Agentes mostraba todos los agentes del inventario desplegados, lo que dificultaba revisar la lista a medida que se crean mas agentes.

### Ajuste

- El inventario funciona como acordeon de una sola tarjeta abierta.
- Al crear, editar, publicar, indexar o probar un agente, ese agente queda desplegado automaticamente.
- Los demas agentes quedan colapsados, pero el usuario puede desplegar cualquiera manualmente.
- El badge principal del inventario muestra estado combinado: `Creado · Sin indexar`, `Listo · Sin indexar` o `Listo · Indexado`, evitando el fondo blanco excesivo en tema oscuro.

## 2026-08-29 - Agent Factory / Listados y etiquetas visuales

### Contexto

Los listados de bases de conocimiento y otros modulos compartian etiquetas con fondos demasiado claros en tema oscuro.

### Ajuste

- El listado de bases de conocimiento usa el mismo patron colapsable del inventario de agentes.
- Al crear una base nueva, queda desplegada automaticamente y las demas permanecen colapsadas.
- El encabezado de bases cambia de `Inventario` a `Biblioteca de contexto`.
- Las etiquetas compartidas de estado, repositorio y carga de archivos usan fondos translucidos adaptados al tema.

## 2026-08-28 - Runbooks / Reinicio local desde Windows

### Contexto

Se necesitaba dejar evidencia operativa de los comandos equivalentes a produccion para reiniciar contenedores desde local en Windows.

### Ajuste

- `.agents/runbooks.md` incluye reinicio local de Agent Factory y Kong desde PowerShell.
- `docs/vps-produccion-ametis.md` incluye la seccion `12.1. Comandos locales desde Windows`, con comandos para RAG, Agent Factory, Kong y validaciones locales.

## 2026-08-28 - Agent Factory / Perfil de contexto del agente

### Contexto

Se inicio la evolucion de la gestion de agentes hacia ingenieria de contexto. Hasta ahora el agente tenia nombre, descripcion, instrucciones y bases de conocimiento; faltaba una ficha operativa mas estructurada para preparar variantes de comportamiento y sincronizar intencion hacia AMETIS AI.

### Ajuste

- Se agrego la tabla `agent_context_profiles` para guardar persona, audiencia objetivo, tono e idioma de respuesta por agente.
- Se evita alterar directamente la tabla historica `agents`, reduciendo riesgo en VPS cuando Flyway no es owner de tablas existentes.
- El backend crea, actualiza, lista, borra y sincroniza el perfil junto con el agente.
- La pantalla de Agentes permite editar la ficha de contexto y muestra un resumen en chips por agente.
- Se ampliaron los catalogos i18n `es` y `en`.

### Validacion

- `npm.cmd run typecheck` ejecutado correctamente en `frontend/agent-factory-app`.
- Tests Maven de `apps/agent-factory-app` ejecutados correctamente via Docker.
- `npm.cmd run lint` queda bloqueado por una regla preexistente en `frontend/agent-factory-app/components/session-guard.tsx`, no tocada en este ajuste.

## 2026-08-28 - Agent Factory / Perfil de contexto del agente

### Contexto

Se inicio la evolucion de la gestion de agentes hacia ingenieria de contexto. Hasta ahora el agente tenia nombre, descripcion, instrucciones y bases de conocimiento; faltaba una ficha operativa mas estructurada para preparar variantes de comportamiento y sincronizar intencion hacia AMETIS AI.

### Ajuste

- Se agrego la tabla `agent_context_profiles` para guardar persona, audiencia objetivo, tono e idioma de respuesta por agente.
- Se evita alterar directamente la tabla historica `agents`, reduciendo riesgo en VPS cuando Flyway no es owner de tablas existentes.
- El backend crea, actualiza, lista, borra y sincroniza el perfil junto con el agente.
- La pantalla de Agentes permite editar la ficha de contexto y muestra un resumen en chips por agente.
- Se ampliaron los catalogos i18n `es` y `en`.

### Validacion

- `npm.cmd run typecheck` ejecutado correctamente en `frontend/agent-factory-app`.
- Tests Maven de `apps/agent-factory-app` ejecutados correctamente via Docker.
- `npm.cmd run lint` queda bloqueado por una regla preexistente en `frontend/agent-factory-app/components/session-guard.tsx`, no tocada en este ajuste.

## 2026-08-23 - Hub orientado a Decision Intelligence

### Contexto

Se ajusto la vista publica de `ametis.hub` para posicionar la plataforma como capa de **Decision Intelligence**, centrada en convertir datos, conocimiento documental e IA en decisiones empresariales accionables.

### Ajuste

- Se actualizo el copy principal del Hub en castellano e ingles hacia Decision Intelligence.
- En el menu de soluciones, **Copiloto Empresarial** pasa a mostrarse como primera linea.
- Dentro de Copiloto Empresarial queda activa solo la opcion **Fabrica de agentes**.
- **Fabrica de agentes** apunta al dominio real `https://ametis.agent-factory.aemetech.com`.
- El resto de verticales y subopciones se mantienen visibles como opciones no disponibles/proximamente, sin navegacion.

## 2026-08-23 - Landing AMETIS / Web chat local y produccion

### Contexto

El web chat del proyecto `am-landing-react` no conectaba correctamente con el servicio RAG/agent-services, mientras que el chat del home de `ametis-platform` si respondia. La diferencia era que la landing intentaba llamar al RAG directamente desde el navegador usando variables `VITE_*`, lo que mezclaba configuracion local y produccion y exponia la integracion a CORS.

### Ajuste

- Se adopto el mismo patron funcional del home de `ametis-platform`: el navegador llama a `/api/rag-chat` y un proxy server-side reenvia la consulta al RAG.
- En local, `am-landing-react` usa `.env.local` con:

```env
RAG_CHAT_API_URL=http://127.0.0.1:8000/tenants/aeme/agents/support_agent/knowledge-bases/landing/query
```

- En produccion/VPS, `am-landing-react` debe usar `.env` o variables de Portainer con:

```env
APP_PORT=3000
RAG_CHAT_API_URL=https://api-rag.aemetech.com/tenants/aeme/agents/support_agent/knowledge-bases/landing/query
```

- Se cambio el runtime Docker de la landing a Nginx y se agrego proxy interno para `/api/rag-chat`.
- Se elimino `VITE_RAG_API_URL` como configuracion recomendada de produccion.
- Se agrego soporte Nginx para resolver upstream HTTPS dentro de Docker (`resolver 127.0.0.11`) y SNI (`proxy_ssl_server_name on`).
- Se documento el detalle completo en `am-landing-react/CHANGELOG.md` y `am-landing-react/README-DOCKER.md`.

### Validacion

- `npm.cmd run build` ejecutado correctamente en `am-landing-react`.
- Prueba local de `POST http://127.0.0.1:8080/api/rag-chat` contra RAG local respondio `200 OK`.
- `docker compose config` en la landing renderiza correctamente con `RAG_CHAT_API_URL` de produccion.
- `docker compose config` falla intencionalmente si falta `RAG_CHAT_API_URL`.

### Pendiente operativo

- En el VPS de la landing, crear `.env` real o configurar variables en Portainer.
- Confirmar que `https://api-rag.aemetech.com` responde por HTTPS desde el VPS de la landing.
- Reconstruir el stack de la landing con `docker compose up -d --build`.

## 2026-08-21 - Preparacion de despliegue VPS y puertos Kong

### Problema

El despliegue en VPS mezclaba puertos internos de Docker con puertos publicados en el host. Kong se habia intentado mover a `8440/8441`, pero la configuracion hacia que el contenedor escuchara en puertos distintos a los publicados.

### Documentacion

Se añadio en `README.md` una receta completa para levantar AMETIS en VPS, incluyendo red externa `ametis_internal`, orden de arranque, archivos `.env`, comprobaciones, URLs de prueba y configuracion de redirects en Keycloak/Google OAuth.

### Ajuste

- Kong mantiene sus puertos internos estables: proxy HTTP `8000`, admin `8001` y proxy TLS `8443`.
- El VPS publica `KONG_PROXY_PORT=8440` hacia `8000` y `KONG_ADMIN_PORT=8441` hacia `8001`.
- Los servicios internos usan `http://kong:8000`.
- Las URLs publicas de navegador usan `http://<vps-host>:8440`.
- Platform se conecta a la red externa compartida `ametis_internal`.
- Agent Factory puede llamar al RAG por `http://ametis_rag_service:8000`.
- Se restauraron reglas de `.gitignore` para evitar commitear `.env` y `.env.*`.
- Kong enruta a `ametis-core-api` y `ametis-agent-factory-app`, usando nombres de contenedor estables en la red compartida.
- Kong usa explicitamente el resolver DNS interno de Docker `127.0.0.11` y los servicios declaran aliases de red estables.
- `.env.example` queda alineado con los dominios publicos HTTPS de AMETIS: Hub, Agent Factory, API y Auth bajo `aemetech.com`.
- Se añade log con tenant y carpeta al fallo `Google Drive listing failed` para diagnosticar permisos, tokens o carpetas invalidas en VPS.
- Agent Factory muestra una accion de reconexion de Google Drive cuando ya existe una cuenta conectada, permitiendo renovar tokens expirados o revocados.

### Pendiente operativo

- Crear la red en el VPS antes de levantar stacks: `docker network create ametis_internal`.
- Sustituir `<vps-host>` por la IP o dominio real en `.env`.
- Registrar en Keycloak los redirect URIs publicos del VPS para `ametis-hub-web` y `agent-factory-web`.

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
