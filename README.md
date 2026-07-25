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
|  |  `- realm-export.json
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

Useful endpoints after startup:

- Kong proxy: `http://localhost:8000`
- Kong admin: `http://localhost:8001`
- Keycloak: `http://localhost:8081`
- PostgreSQL: `localhost:5432`
- Kafka: `localhost:9092`

## Notes

- This blueprint now includes an executable Spring Boot `core-api` MVP service.
- Before using the API, run database setup once:
  - `powershell -ExecutionPolicy Bypass -File .\db\apply-db-config.ps1`
