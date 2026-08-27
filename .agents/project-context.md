# AMETIS Platform Project Context

## Purpose

`ametis-platform` is the executable platform blueprint for AMETIS:

- multi-tenant core;
- centralized identity with Keycloak;
- RBAC and subscription-aware authorization;
- product applications, currently including Agent Factory and Newsletter;
- public routing through Kong;
- integration with `ametis-ai` for RAG, indexing, and document intelligence.

This context folder exists so coding agents can enter the project through a compact, maintained map instead of rereading the whole repository each time.

## Repository Map

- `core/apps/core-api`: platform API for auth, tenants, memberships, products, profile, and authorization checks.
- `apps/agent-factory-app`: Spring Boot backend for Agent Factory.
- `frontend/agent-factory-app`: Next.js frontend for Agent Factory.
- `apps/newsletter-app`: Spring Boot backend for Newsletter.
- `frontend/newsletter-app`: Next.js frontend for Newsletter.
- `frontend/web-app`: Hub web frontend.
- `infra/docker-compose.yml`: base platform services such as Keycloak, Core API, and Kong.
- `infra/platform-stack.compose.yml`: Agent Factory backend/frontend and Hub web.
- `infra/kong/kong.yml`: public API routing.
- `db/` and app-local `db/migration/`: database schema and Flyway migrations.
- `docs/`: longer-form architecture, VPS, and history notes.

## Current Product Flow

Agent Factory currently follows this flow:

```text
Workspace
  -> Google Drive connection
  -> Repository namespace
  -> Documents
  -> Knowledge bases
  -> Agents
  -> Publication / deployments
  -> AMETIS AI / RAG Service
```

## Context Engineering Goal

Development context should answer these questions quickly:

- What service owns this behavior?
- What route/domain should be used locally and in VPS?
- What data model or migration is involved?
- What prior decision should not be rediscovered?
- What known incident might explain the symptom?

Update this folder whenever a production incident, architecture decision, or repeated debugging path teaches something durable.

