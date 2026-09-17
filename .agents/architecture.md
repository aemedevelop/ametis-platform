# Architecture Context

## Service Boundaries

- `core-api` is the source of truth for identity-adjacent platform data: users, tenants, memberships, products, roles, plans, subscriptions, and authorization checks.
- Product apps do not duplicate platform auth logic. They call Core for access checks and use the active tenant context.
- Agent Factory owns document repository setup, Google Drive connection state, **businesses**, knowledge bases, documents, agents, publication, and deployments.
- `ametis-ai` owns RAG ingestion, vector storage, indexing, and model-facing retrieval behavior.

## Multi-Client Model (Business Layer)

Agent Factory is an agency / multi-client platform. Hierarchy:

```text
Tenant (Core, = workspace)
  -> Business (negocio, = end client of a consultant/agency)
       -> Knowledge Base (categoria)
            -> Documents
       -> Agents  (an agent uses one or more knowledge bases of its business)
       -> Deployments (inherit the agent's business)
```

- `businesses` table (schema `agent_factory`): `id, tenant_id, name, slug, status (ACTIVE/ARCHIVED)`, plus its own Drive folder (`workspace_subfolder_id`, `repository_status`).
- `agents.business_id`, `knowledge_bases.business_id`, `document_assets.business_id` and `.knowledge_base_id` are all NOT NULL. Name uniqueness moved from `(tenant_id, name)` to `(business_id, name)`.
- A document belongs to exactly ONE knowledge base (`knowledge_base_documents` m2m was removed in V15).
- The active business travels in the `X-Business-Id` header (mirrors `X-Tenant-Id`), resolved by `BusinessContextFilter`, validated against the tenant by `BusinessService.require(...)`. `AccessGuard.requireBusinessId()` exposes it.
- Controllers for agents / knowledge-bases / documents resolve a `Business` via `businessService.require(tenantId, requireBusinessId())` and pass it to services. `/repository/*` (Drive root + namespace) stays tenant-level.

## Isolation

`tenant_id + business_id + agent_id + knowledge_base_id` are ALL mandatory `must` filters on every Qdrant retrieval and on every indexed chunk payload. Even two agents of the same business cannot cross documents. Platform-side, every list/get is scoped by `business_id` (and by KB where applicable).

## Deployment Public Endpoint

- `agent_deployments.public_id` = opaque 32-hex token (no prefix), immutable except via `POST /deployments/{id}/public-id` (regenerate).
- Public consumption route (no JWT): `GET|POST {agent-factory.public.base-url}/{publicId}[/query]` -> `PublicDeploymentController` -> resolves deployment -> agent + KB -> `ragClient.query(namespace, businessId, agentId, kbId, question)`.
- Only channel `WEB_CHAT` is served today; `API` / `INTERNAL_TEST` return 404 (`validateApiKey` exists, unused). `WEB_CHAT` validates the `Origin` header against `agent_deployments.allowed_origins`. **Secure by default (2026-09-05): an empty allow-list serves nobody** (403 `error.deploymentOriginNotAllowed`) — the deployment owner must explicitly declare every origin (`scheme://host[:port]`). Origin validation only stops another site embedding the widget; a script can spoof `Origin`, so real lock-down still needs the (unused) API key.
- `agent-factory.public.base-url` config (`AGENT_FACTORY_PUBLIC_BASE_URL`): local `http://localhost:8440/api/agent-factory/public`, VPS `https://ametis.api.aemetech.com/api/agent-factory/public`. Kong needs no new route (the `/api/agent-factory` prefix already passes through).
- `DeploymentResponse` returns derived `endpointUrl`, `queryUrl`, `embedSnippet`. `widget-url` derives from `agent-factory.public.base-url` (`/widget.js`), served by `PublicWidgetController` from `resources/widget/ametis-widget.js` (built from `frontend/ametis-widget/`, `npm run build:copy`).
- **Contenido personalizado del asistente** (`agents.suggested_questions` + `assistant_texts` V18; `_count` + `_order` V19; `question_topics` V20 — jsonb en la plataforma): preguntas sugeridas (fondo "General" + grupos por **tema**), `count`, `order` (`random`/`fixed`), y textos que sustituyen los genéricos (`fallback`/`greeting`/`thanks`/`farewell`/`help`).
  - **Textos**: en `/query` la plataforma cambia `answer` por el del cliente según `response_type`/`prebuilt_key` del RAG.
  - **Chips por tema (Feature B, con Qdrant)**: al guardar/borrar el agente → `PUT|DELETE /agents/{id}/suggestion-index` en el RAG, que indexa cada pregunta (`agent_id`, `topic_id`) en la colección por tenant `…_suggested_questions`. En `/query` el RAG reutiliza el vector de la pregunta del retrieval, busca el tema más cercano (umbral `SUGGESTED_QUESTIONS_MATCH_THRESHOLD`) y devuelve `matched_topic_id`. La plataforma pasa en `suggestions` el pool del tema casado (o "General"); el widget muestra el subconjunto (`count`/`order`, excluye la pregunta hecha). Bienvenida = "General".
  - El RAG ya no tiene sugerencias hardcodeadas (`build_suggestions` → `[]`); `match_prebuilt_response` devuelve además la clave del tipo. `max_output_tokens` del LLM → `LLM_MAX_OUTPUT_TOKENS` (800).
- **Web chat appearance** (`agent_deployments.theme_*`, V17; `theme_avatar_key` V22): `primary_color` (hex), `font` (`system|humanist|serif|mono` — the widget maps to a system stack, no web fonts), `position` (`bottom-right`/`bottom-left`), `title`, `subtitle`, and a **logo/avatar image**. All optional. Configured on a dedicated page `/deployments/[id]/appearance` (not the create/edit form) via `PATCH /deployments/{id}/appearance`, returned in `theme` of `GET /public/{publicId}`, applied by the widget. No `data-*` overrides. The appearance page has a live preview: an `<iframe>` running the real widget bundle in **preview mode** (`data-preview="1"` → skips fetch, reads theme via `postMessage`).
  - **Avatar upload**: `POST/DELETE /deployments/{id}/appearance/avatar` (multipart) stores the image via `StorageProvider.putObject` under a `branding/` container in the tenant's workspace and saves only the **object key** in `theme_avatar_key` (never a data URI in the DB). Served publicly (no JWT) at `GET /public/{publicId}/avatar`, which streams it via `StorageProvider.downloadObject` — works for Drive or MinIO transparently. `theme.avatarUrl` in the response is this computed URL, `null` when no avatar is set. The widget swaps its default message icon for the avatar in both the launcher bubble and the header, in normal and preview mode.

## Authentication And Authorization

- Keycloak realm: `ametis`.
- Frontend public clients include `ametis-hub-web`, `newsletter-web`, and `agent-factory-web`.
- Frontends use Authorization Code with PKCE.
- Backend APIs validate JWTs as OAuth2 resource servers.
- Effective authorization rule:

```text
ALLOW = authenticated AND tenant_membership AND role_permission AND plan_feature
```

## Self-Service Registration & Onboarding

- `POST /v1/auth/register` (Core): creates the Keycloak user + Core profile, then `RegistrationProvisioningService.provisionInitialWorkspace()` creates a tenant with the user as `OWNER` and grants access to `core.registration.default-product-code` (now `agent-factory`).
- `POST /v1/auth/login` (Core): password grant via the confidential `core-api` Keycloak client (needs Direct Access Grants enabled). `POST /v1/auth/refresh` without `clientId` refreshes those sessions server-side; with a public `clientId` it refreshes SSO sessions.
- `agent-factory-app` tracks an auth mode in browser storage (`sso` | `password`); `refreshSession` only sends `clientId: agent-factory-web` for `sso`.
- Frontend flow: `/auth/register` → auto `loginWithPassword` → `/onboarding` (creates the tenant's first `Business`) → dashboard. `authenticatedFetch` redirects to `/onboarding` on `error.workspaceMissing` / `error.businessMissing`. `/auth/login` also offers the email/password form; SSO ("Continuar con AMETIS") stays as a secondary option.
- v1 assumes **one workspace per user** (no workspace switcher yet).

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

## Document/Asset Storage

- `com.ametis.agentfactory.storage.StorageProvider` — the single abstraction all document/asset code talks to: `provisionWorkspace/Container`, `putObject`, `listObjects`, `getObject`, `downloadObject`, `deleteObject/Container`, `renameWorkspace`. `RepositoryProvisioningService`, `Business/KnowledgeBaseRepositoryProvisioningService`, `DocumentService`, `BusinessDeletionService`, `KnowledgeBaseService` depend on this interface, never on `GoogleDriveRepository` directly.
- Two implementations, exactly one active bean per environment via `@ConditionalOnProperty("agent-factory.storage.provider")`:
  - `GoogleDriveStorageProvider` (**default**, `provider=drive`): mechanical wrap of `GoogleDriveRepository` — Drive folders as containers, Drive `File` as objects. No behaviour change from before this abstraction existed.
  - `MinioStorageProvider` (`provider=minio`, `io.minio:minio:8.5.12`): **bucket per tenant** (`{AGENT_FACTORY_MINIO_BUCKET_PREFIX}{namespace}`, default prefix `af-`), business/KB containers are key prefixes (`{business-slug}/{kb-slug}/`), objects are `{uuid-or-documentAssetId}__{filename}`, original filename kept in S3 user metadata. Bucket resolved per call via `RepositoryBindingRepository` (`repository_bindings.bucket_name`). Deletes are **hard/definitive** (no trash, unlike Drive).
- Storage-neutral column names (`V21`): `repository_bindings.workspace_locator`/`documents_locator`/`bucket_name`, `businesses.storage_locator`, `knowledge_bases.documents_locator`, `document_assets.storage_object_key`. `repository_bindings.provider` (was hardcoded `"GOOGLE_DRIVE"`, decorative) is now the real selector value (`drive`/`minio`), set at provisioning time from `agent-factory.storage.provider`.
- When `provider=minio`, `GET /drive/connection` returns `MANAGED` (same status the shared-credentials Drive modes already used) — the frontend's existing "storage is managed by AMETIS" flow applies unchanged, no per-tenant Drive connection needed, no new UI.
- Env: `AGENT_FACTORY_STORAGE_PROVIDER` (`drive`|`minio`, default `drive`), `AGENT_FACTORY_MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET_PREFIX/SECURE`. Local infra: `minio` service in `infra/docker-compose.yml` (ports 9000 API / 9001 console).
- RAG side kept in lockstep: `AmetisAiKnowledgeBaseSyncPayload.documentsLocator` (was `documentsFolderId`) → `KnowledgeBaseSyncPayload.documentsLocator` (`api.py`) → `agent_knowledge_bases.documents_locator` (new column, `documents_folder_id` kept for backward read-compat via `coalesce`) → `indexing_jobs.documents_locator` → `MinioDocumentLoader.list_documents(tenant_id, documents_locator=...)`: with a locator, treats it as the key prefix inside `MINIO_BUCKET_TEMPLATE.format(tenant_id=...)` (default `af-{tenant_id}`); without one, falls back to the legacy single-bucket `MINIO_BUCKET`/`MINIO_PREFIX_TEMPLATE`.
- Switching an environment's `provider` to `minio` is a **deliberate, explicit** action (env var), never automatic. Default everywhere is still `drive`.

## Google Drive

- The Drive is **controlled by AEME** (a single AEME Google account / service account against an AEME-owned root folder). `AGENT_FACTORY_GOOGLE_AUTH_MODE`: `service-account` (current — SA `ametis-rag-drive-document-repo@aeme-dev`, same JSON the RAG uses, shared into the root folder), `oauth-user` (one shared AEME refresh token, `AGENT_FACTORY_GOOGLE_OAUTH_REFRESH_TOKEN` — currently unset), or `workspace-oauth` (per-tenant OAuth, legacy).
- In `oauth-user`/`service-account` mode there is no per-tenant Drive connection: `GET /drive/connection` returns status `MANAGED`, the dashboard hides "Connect Drive" and auto-provisions the tenant repository on load (`POST /repository/provision` with no namespace → derived from the tenant slug). `GoogleDriveClientFactory.create(tenantId)` falls back to the shared credentials.
- To remove the 7-day refresh-token expiry: publish the OAuth consent screen to "In production" in Google Cloud Console (Google Auth Platform -> "Público" -> PUBLICAR APLICACIÓN). Free; the "unverified app" warning stays (fine <100 users). The `drive` scope is restricted -> full verification would need a paid CASA audit; not needed for MVP.
- OAuth callback must point to the public API domain that routes `/api/agent-factory` to Kong/backend. Frontend return URI points back to Agent Factory Web.
- `AGENT_FACTORY_GOOGLE_ROOT_FOLDER_ID` (platform) and `GOOGLE_DRIVE_ROOT_FOLDER_ID` (`ametis-ai`) must identify the same environment-specific root. Production root separate from local/PRE.

### Drive folder hierarchy (per business, per KB)

```text
{AGENT_FACTORY_GOOGLE_ROOT_FOLDER_ID}/
  {namespace}/                       repository_bindings.workspace_folder_id  (tenant)
    {negocio-slug}/                  businesses.workspace_subfolder_id
      {base-slug--<8hex>}/           knowledge_bases.documents_folder_id  (files live here)
```

- `BusinessRepositoryProvisioningService` creates `{namespace}/{negocio-slug}/` (lazy, on first document access or KB create).
- `KnowledgeBaseRepositoryProvisioningService` creates `{negocio}/{base-folderName}/`.
- `GoogleDriveRepository.provisionFolder(...)` is the generic find-or-create helper.
- The RAG receives each KB's `documentsFolderId` inside the agent sync payload (`AmetisAiKnowledgeBaseSyncPayload`); the indexing worker reads per-KB folder from `agent_knowledge_bases.documents_folder_id`.

## Database

- Agent Factory uses schema `agent_factory`.
- Flyway migrations run from `apps/agent-factory-app/src/main/resources/db/migration`. Current head: **V22**.
  - V6 agent_deployments · V7 agent_context_profiles (made idempotent) · V8 deployment channel config (welcome message, rate limits) · V9 deployment allowed_origins · V10/V11 deployment public_id (V11 stripped the `dep_` prefix) · V12 businesses · V13 agents/KB business_id + backfill "Negocio principal" · V14 business Drive folder + document_assets.business_id · V15 KB Drive folder + document_assets.knowledge_base_id + drop knowledge_base_documents · V16 business_deletion_log · V17 `agent_deployments.theme_*` (web chat appearance: `theme_primary_color`, `theme_font`, `theme_position`, `theme_title`, `theme_subtitle`) · V18 `agents.suggested_questions` + `agents.assistant_texts` (jsonb; contenido personalizado del asistente, no viaja al RAG) · V19 `agents.suggested_questions_count` + `agents.suggested_questions_order` (cuántos chips y en qué orden — `random`/`fixed`) · V20 `agents.question_topics` (jsonb; preguntas sugeridas agrupadas por tema, Feature B) · V21 renombrado neutral de almacenamiento (`workspace_locator`, `documents_locator` ×2, `storage_locator`, `storage_object_key` + `repository_bindings.bucket_name`; `provider` reutilizada como selector `drive`/`minio`) · V22 `agent_deployments.theme_avatar_key` (logo del widget, referencia al almacenamiento).
- In VPS, verify table ownership and grants before adding migrations with foreign keys. The app user needs `REFERENCES` on referenced tables (V6 incident). Flyway checksum mismatch after local re-runs: `flyway repair` or make the migration idempotent (`create table if not exists`).

