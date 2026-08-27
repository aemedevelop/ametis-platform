# Architecture Context

## Service Boundaries

- `core-api` is the source of truth for identity-adjacent platform data: users, tenants, memberships, products, roles, plans, subscriptions, and authorization checks.
- Product apps do not duplicate platform auth logic. They call Core for access checks and use the active tenant context.
- Agent Factory owns document repository setup, Google Drive OAuth connection state, document metadata, knowledge bases, agents, publication, and deployments.
- `ametis-ai` owns RAG ingestion, vector storage, indexing, and model-facing retrieval behavior.

## Authentication And Authorization

- Keycloak realm: `ametis`.
- Frontend public clients include `ametis-hub-web`, `newsletter-web`, and `agent-factory-web`.
- Frontends use Authorization Code with PKCE.
- Backend APIs validate JWTs as OAuth2 resource servers.
- Effective authorization rule:

```text
ALLOW = authenticated AND tenant_membership AND role_permission AND plan_feature
```

## Routing

Local:

```text
Agent Factory Web -> http://localhost:3200
Kong public API   -> http://localhost:8440
Agent Factory API -> http://localhost:8440/api/agent-factory
Keycloak          -> http://localhost:8081
```

VPS production:

```text
ametis.hub.aemetech.com            -> Hub Web
ametis.agent-factory.aemetech.com  -> Agent Factory Web
ametis.api.aemetech.com            -> Kong proxy
ametis.auth.aemetech.com           -> Keycloak
```

Docker-internal URLs should use container aliases:

```text
agent-factory-app -> http://kong:8000 for Core through Kong
agent-factory-app -> http://rag-service:8000 for AMETIS AI
Kong              -> http://ametis-agent-factory-app:8083
Kong              -> http://ametis-core-api:8080
```

Do not use public HTTPS domains for container-to-container calls unless the browser is the caller.

## Google Drive

- Agent Factory supports workspace OAuth mode for connecting a tenant/workspace to Google Drive.
- OAuth callback must point to the public API domain that routes `/api/agent-factory` to Kong/backend.
- Frontend return URI should point back to Agent Factory Web.
- Production Drive root folder must be separate from local/PRE roots.
- `AGENT_FACTORY_GOOGLE_ROOT_FOLDER_ID` in platform and `GOOGLE_DRIVE_ROOT_FOLDER_ID` in `ametis-ai` must identify the same environment-specific root.

## Database

- Agent Factory uses schema `agent_factory`.
- Flyway migrations run from `apps/agent-factory-app/src/main/resources/db/migration`.
- In VPS, verify table ownership and grants before adding migrations with foreign keys. The app user needs `REFERENCES` on referenced tables.

