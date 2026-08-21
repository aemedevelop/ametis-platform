# Plataforma de Inteligencia Empresarial - Core Blueprint

Este repositorio contiene el blueprint ejecutable de AMETIS Platform:

- base multi-tenant;
- identidad desacoplada de la lógica de negocio;
- RBAC + control por suscripción;
- contratos de integración event-driven;
- aplicaciones de producto sobre la plataforma, incluyendo **Agent Factory**.

## Estructura del repositorio

```text
.
|- contracts/
|  |- asyncapi/core-events.v1.yaml
|  `- openapi/core-api.v1.yaml
|- core/
|  |- modules/
|  |  |- access-control/
|  |  |- configuration/
|  |  |- core-api/
|  |  |- event-bus/
|  |  |- identity-adapter/
|  |  |- subscription/
|  |  `- tenant-management/
|  `- README.md
|- apps/
|  |- agent-factory-app/
|  `- newsletter-app/
|- frontend/
|  |- agent-factory-app/
|  |- newsletter-app/
|  `- web-app/
|- db/
|- docs/
|- infra/
`- scripts/
```

## Modelo de autorización

La decisión final de autorización sigue esta regla:

```text
ALLOW = authenticated AND tenant_membership AND role_permission AND plan_feature
```

Flujo:

1. El usuario se autentica con Keycloak.
2. El usuario pertenece al tenant activo.
3. Su rol concede el permiso solicitado.
4. La suscripción del tenant habilita la funcionalidad asociada.

## Autenticación OIDC

- Keycloak centraliza autenticación y SSO en el realm `ametis`.
- Cada SPA utiliza un cliente público independiente:
  - `ametis-hub-web`;
  - `newsletter-web`;
  - `agent-factory-web`.
- Los frontends usan Authorization Code con PKCE `S256`.
- No se exponen secretos en el navegador.
- `core-api` queda como cliente confidencial de servidor y no se reutiliza desde SPAs.
- El intercambio de código en Core solo admite clientes públicos incluidos en `AUTH_KEYCLOAK_PUBLIC_CLIENT_IDS`.
- El tema `ametis` extiende `keycloak.v2` para mantener continuidad visual entre las apps y Keycloak.

Para actualizar un realm local existente sin eliminar usuarios:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure-keycloak.ps1
```

## Agent Factory / Fábrica de agentes

Agent Factory es la aplicación de producto encargada de preparar el conocimiento y la configuración inicial de agentes por workspace.

### Responsabilidad actual

Agent Factory gestiona:

- conexión del workspace con Google Drive;
- creación o reutilización del namespace documental;
- estructura documental `{namespace}/docs`;
- subida, listado, descarga, refresco y eliminación de documentos;
- agrupación de documentos en bases de conocimiento;
- creación de agentes;
- asociación de agentes con bases de conocimiento;
- publicación MVP de agentes;
- integración opcional con `ametis-ai` para disparar ingesta RAG.

### Flujo funcional actual

```text
Workspace
  -> Documentos
  -> Bases de conocimiento
  -> Agentes
  -> Publicación
  -> AMETIS AI / RAG Service
```

### Documentos

- El usuario conecta su Google Drive mediante OAuth.
- AMETIS crea o reutiliza una carpeta identificable por workspace.
- Los documentos se guardan en:

```text
{namespace}/docs
```

- Se soportan documentos compatibles con el parser actual de AMETIS AI.
- La interfaz permite refrescar la biblioteca si un archivo cambia manualmente en Drive.

### Namespace documental

- El usuario puede editar la parte legible del namespace.
- El identificador técnico del tenant no es editable.
- El namespace se usa como identificador documental para `ametis-ai`.

Ejemplo:

```text
owner-demo--6d293a5d
```

### Bases de conocimiento

Las bases de conocimiento agrupan documentos por caso de uso, área funcional o agente objetivo.

En esta fase:

- se guardan en la base de datos de Agent Factory;
- se asocian a documentos almacenados;
- no ejecutan indexación por sí solas.

### Agentes

Cada agente contiene:

- nombre;
- descripción;
- instrucciones;
- estado;
- bases de conocimiento asociadas;
- fecha de publicación.

La publicación cambia el estado:

```text
DRAFT -> READY
```

Y exige que el agente tenga al menos una base de conocimiento asociada.

### Integración con AMETIS AI

La integración con `ametis-ai` es opcional y se activa configurando:

```env
AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL=http://...
```

Cuando está configurada, al publicar un agente se llama al RAG service por cada base asociada:

```text
POST {AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL}/agents/sync
```

Contrato actual:

- `tenant_id` en `ametis-ai` = namespace documental;
- `agent_id` = UUID del agente en Agent Factory;
- `knowledge_base_id` = UUID de la base de conocimiento en Agent Factory.

Esta integración dispara ingesta e indexación documental, pero todavía no sincroniza la ficha completa del agente.

Próximo paso previsto:

```text
POST /agents/sync
```

en `ametis-ai`, para enviar nombre, descripción, instrucciones y bases asociadas.

### Backend Agent Factory

Ubicación:

```text
apps/agent-factory-app
```

Responsabilidades:

- API documental;
- API de Drive OAuth;
- API de bases de conocimiento;
- API de agentes;
- publicación;
- migraciones Flyway;
- validación de permisos contra Core.

Migraciones principales:

- `V3__knowledge_bases.sql`
- `V4__agents.sql`
- `V5__agent_publication.sql`

### Frontend Agent Factory

Ubicación:

```text
frontend/agent-factory-app
```

Responsabilidades:

- shell visual de la aplicación;
- soporte de tema e idioma;
- autenticación OIDC + PKCE;
- pantalla documental;
- pantalla de bases de conocimiento;
- pantalla de agentes;
- publicación manual de agentes.

Todos los textos visibles deben declararse en:

```text
frontend/agent-factory-app/locales/es.json
frontend/agent-factory-app/locales/en.json
```

No se deben añadir literales visibles hardcodeados en componentes.

### Variables relevantes

```env
AGENT_FACTORY_GOOGLE_ROOT_FOLDER_ID=
AGENT_FACTORY_GOOGLE_AUTH_MODE=workspace-oauth
AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_ID=
AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_SECRET=
AGENT_FACTORY_GOOGLE_OAUTH_REDIRECT_URI=
AGENT_FACTORY_GOOGLE_FRONTEND_RETURN_URI=
AGENT_FACTORY_GOOGLE_TOKEN_ENCRYPTION_KEY=
AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL=
```

Para local, el callback OAuth puede apuntar a `localhost`. Para VPS/producción debe configurarse con el dominio público definitivo y registrarse también en Google Cloud.

## Quick Start

Requisitos:

- Docker Desktop con Compose v2.

Levantar infraestructura base:

```powershell
./scripts/bootstrap.ps1
```

Levantar Agent Factory con stack de plataforma:

```powershell
docker network create ametis_internal
docker compose --env-file .env -f ./infra/docker-compose.yml -f ./infra/platform-stack.compose.yml up -d --build agent-factory-app agent-factory-web kong
```

Endpoints útiles:

- Kong proxy: `http://localhost:8440`
- Kong admin: `http://localhost:8441`
- Keycloak: `http://localhost:8081`
- PostgreSQL: `localhost:5432`
- Kafka: `localhost:9092`
- Agent Factory API por Kong: `http://localhost:8440/api/agent-factory`
- Agent Factory Web: `http://localhost:3200`

Para VPS, sustituir `localhost` por la IP o dominio publico en `.env`.
Dentro de Docker deben mantenerse URLs internas como `http://kong:8000`,
`http://keycloak:8080` y `http://ametis_rag_service:8000`.

## Históricos

Los cambios relevantes deben quedar registrados en:

- `docs/historico.md` en este repositorio;
- `docs/historico.md` en `ametis-ai` cuando el cambio afecte a IA/RAG/sincronización.

## Validaciones habituales

Frontend Agent Factory:

```powershell
cd frontend/agent-factory-app
npm.cmd run typecheck
npm.cmd run lint
```

Backend Agent Factory:

```powershell
docker run --rm -v "${PWD}:/app" -w /app/apps/agent-factory-app maven:3.9.9-eclipse-temurin-21 mvn -q test
```

Build local:

```powershell
docker compose --env-file .env -f ./infra/docker-compose.yml -f ./infra/platform-stack.compose.yml build agent-factory-app agent-factory-web
```
