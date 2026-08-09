# Plataforma de Inteligencia Empresarial - Core Blueprint

This repository contains an executable blueprint for the Core platform:

- Multi-tenant foundation.
- Identity decoupled from business logic.
- RBAC + subscription feature gating.
- Event-driven integration contracts.

## Repository Layout

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
|- db/
|  |- migrations/
|  |  |- V1__core_schema.sql
|  |  `- V2__rbac_and_subscription_seed.sql
|  `- postgres/
|     `- 01-init-databases.sql
|- infra/
|  |- docker-compose.yml
|  |- keycloak/
|  |  |- realm-export.json
|  |  `- themes/ametis/
|  `- kong/
|     `- kong.yml
|- frontend/
|  `- web-app/
`- scripts/
   `- bootstrap.ps1
```

## Core Authorization Model

Final authorization decision:

1. User is authenticated by Keycloak.
2. User has active membership in selected tenant.
3. Membership role grants the requested permission.
4. Tenant subscription enables feature mapped to permission.

Result:

`ALLOW = authenticated AND tenant_membership AND role_permission AND plan_feature`

## Autenticación OIDC

- Keycloak centraliza la autenticación y el SSO en el realm `ametis`.
- Cada SPA utiliza un cliente público independiente: `ametis-hub-web`, `newsletter-web` y `agent-factory-web`.
- Los clientes web usan Authorization Code con PKCE `S256`, sin secretos en el navegador y con callbacks exactos.
- `core-api` es un cliente confidencial de servidor y no se reutiliza desde los frontends.
- El intercambio de código en Core solo admite clientes públicos incluidos en `AUTH_KEYCLOAK_PUBLIC_CLIENT_IDS`.
- El tema `ametis` extiende `keycloak.v2` y personaliza estilos y mensajes sin duplicar plantillas FreeMarker.

Para actualizar un realm local ya existente sin eliminar usuarios:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure-keycloak.ps1
```

## Quick Start

Requirements:

- Docker Desktop (Compose v2).

Start infrastructure:

```powershell
./scripts/bootstrap.ps1
```

Start frontend:

```powershell
cd ./frontend/web-app
npm install
npm run dev
```

Prepare Agent Factory:

```powershell
./db/apply-db-config.ps1
$env:AGENT_FACTORY_GOOGLE_ROOT_FOLDER_ID="<drive-root-folder-id>"
$env:AGENT_FACTORY_GOOGLE_AUTH_MODE="workspace-oauth"
$env:AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_ID="<oauth-client-id>"
$env:AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_SECRET="<oauth-client-secret>"
$env:AGENT_FACTORY_GOOGLE_OAUTH_REDIRECT_URI="https://agents.example.com/api/agent-factory/drive/oauth/callback"
$env:AGENT_FACTORY_GOOGLE_FRONTEND_RETURN_URI="https://agents.example.com"
docker compose -f ./infra/docker-compose.yml -f ./infra/platform-stack.compose.yml up -d --build agent-factory-app agent-factory-web kong
```

Register `AGENT_FACTORY_GOOGLE_OAUTH_REDIRECT_URI` as an authorized redirect URI in the Google OAuth web client. Workspace users then connect their own account from Agent Factory; refresh tokens are encrypted server-side and never pass through the frontend. AMETIS AI can continue reading with its current service account. The legacy `service-account` mode remains available for roots located in a Google Shared Drive.

Useful endpoints after startup:

- Kong proxy: `http://localhost:8000`
- Kong admin: `http://localhost:8001`
- Keycloak: `http://localhost:8081`
- PostgreSQL: `localhost:5432`
- Kafka: `localhost:9092`
- Agent Factory API: `http://localhost:8000/api/agent-factory`
- Agent Factory Web: `http://localhost:3200`

## Notes

- This blueprint now includes an executable Spring Boot `core-api` MVP service.
- Before using the API, run database setup once:
  - `powershell -ExecutionPolicy Bypass -File .\db\apply-db-config.ps1`
