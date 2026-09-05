# Current State

Last updated: 2026-08-30

## Active Branch

- `develop`. **Nothing committed this session** — large uncommitted diff across `ametis-platform` and `ametis-ai` (business layer, isolation, Drive hierarchy, deployment public endpoint). Commit before any context reset.

## What was built (Aug 29–30, one long session)

1. **Deployment module completed**: channel config (welcome message, per-minute/day rate limits), `allowed_origins`, opaque `public_id` (32-hex, regenerable), derived `endpointUrl`/`queryUrl`/`embedSnippet` in the response, `PublicDeploymentController` public endpoint (`/api/agent-factory/public/{publicId}[/query]`, WEB_CHAT only, Origin-checked, no JWT). `SecurityConfig` permits `/public/**` and allows `X-Business-Id` in CORS.
2. **Agent context profile -> RAG**: publish syncs persona/audience/tone/language; RAG stores them and injects into the prompt. (Fixed a placeholder-count bug and a privilege bug in `agent_sync_repository.py`.)
3. **Business layer (variant A)**: `businesses` table + `X-Business-Id` context + switcher + `/businesses` page. `agents` and `knowledge_bases` and `document_assets` gained `business_id`.
   - Business lifecycle: use / edit / **archive** (logical, reversible) / **delete** (physical). `V16` adds `business_deletion_log` (audit row survives). `POST /businesses/{id}/delete` requires status ARCHIVED + a confirmation name matching; `BusinessDeletionService` cascades platform DB (agents -> DB cascade to deployments/profiles/akb, then docs, then KBs, then the business), trashes the Drive folder (30-day recoverable), and calls RAG `DELETE /businesses/{id}?tenant_id={namespace}` which deletes synced rows + Qdrant points by `business_id` (best-effort).
4. **Documents per business, then per knowledge base**: Drive hierarchy `{namespace}/{negocio}/{base}/`. `document_assets.knowledge_base_id` (one doc = one base), `knowledge_base_documents` dropped. Document CRUD moved to `/knowledge-bases/{id}/documents`. Dashboard is now just Drive + repository setup; the namespace field defaults to the active business slug.
5. **Strong isolation in the RAG (high priority)**: `business_id` is a mandatory `must` filter in `MetadataFilter` / `build_base_document_filter`, stamped on every chunk payload, carried in sync / indexing / query contracts. Each indexing job uses its own KB folder (`agent_knowledge_bases.documents_folder_id`).
6. Option A for the Drive folder-not-found bug: platform passes the resolved Drive folder id to the RAG (per KB now); no more name lookups against Drive's eventually-consistent index. Added `corpora="allDrives"`.
7. `rag-service` local DB switched from the VPS Postgres (`13.140.179.140`) to the local `ametis_postgres` container.

9. **Drive storage backend** (2026-08-30 → reverted 2026-09-04): tried `service-account` mode for a no-connect experience, but the SA has no Drive quota (folder creation works, file upload fails: "file is in My Drive → use a Shared Drive"). **Decision: move document storage to MinIO** (bucket per tenant), keep Drive switchable — full spec in `.agents/proposals/minio-storage-migration.md`, decision in `decisions.md`. **For the current release, Drive is back on `AGENT_FACTORY_GOOGLE_AUTH_MODE=workspace-oauth`**: the tenant owner connects their own Google Drive via OAuth (the flow that worked before). The `MANAGED` status code added to `GoogleDriveOAuthService` is inert in `workspace-oauth` mode and stays for the MinIO work. New users never connect Drive: `/drive/connection` returns `MANAGED`, the dashboard auto-provisions the tenant repository on load. `authorize()` → 409 `error.driveManaged`.

8. **Self-service account + workspace + onboarding** (2026-08-30): `agent-factory-app` now has `/auth/register` (name/email/password → `POST /v1/auth/register` → `loginWithPassword` → `/onboarding`) and `/auth/login` gained an email/password form (SSO kept as secondary). `/onboarding` creates the tenant's first business. `authenticatedFetch` redirects to `/onboarding` on `error.workspaceMissing`/`error.businessMissing`. Session tracks an auth mode (`sso` vs `password`) so `refreshSession` only sends `clientId` for SSO sessions. Core: `application.yml` `core.registration.default-product-code` now defaults to `agent-factory` (was `newsletter`). **Needs**: Keycloak `core-api` client with Direct Access Grants enabled; still missing email verification / password reset.

## Migrations at head: V16 (see architecture.md for the list). RAG adds columns at runtime via defensive `ensure_*` ALTERs (savepoint + swallow InsufficientPrivilege) — `business_repository.delete_business_data` now calls the `ensure_*` helpers before deleting (local RAG DB predates `business_id`).

## Known follow-ups / not done

- Re-index everything after deploying the `business_id` filter (existing Qdrant chunks lack the tag -> queries return nothing until re-indexed).
- Deployment consumption security beyond Origin (api key for `API`/WhatsApp channels, rate-limit enforcement).
- The embeddable `ametis-widget.js` bundle (Shadow DOM, reads `data-deployment`/`data-endpoint`, self-mounts). Source would live in `am-landing-react`.
- Indexing is slow: CPU-only `bge-m3` embeddings, one chunk per request. Options: batch `/api/embed`, lighter model (needs re-index + Qdrant collection recreate), GPU, or `OLLAMA_KEEP_ALIVE`.
- Publish the Google OAuth app to production to stop 7-day token expiry.
- Keycloak: email verification + password-reset flow for self-service accounts. Enable Direct Access Grants on the `core-api` client (needed for `/v1/auth/login`).
- Workspace switcher + "create workspace" (v1 assumes one workspace per user).
- **MinIO document storage** — designed, not built. Next big task after the Drive release. Spec: `.agents/proposals/minio-storage-migration.md`.

## Local environment quirks

- Two local Postgres containers: `ametis-postgres` (port **5433**, `agent_factory_db`, user `agent_factory_user`/`agent_factory_pass`, schema `agent_factory`) for the platform; `ametis_postgres` (underscore, port 5432, db `ametis`, user/pass `ametis`, schema `ametis_ai`) for the RAG. From DBeaver on Windows use `localhost` + the published port, never the container alias.
- No Maven on the host: compile via `docker run --rm -v <repo>:/w -v ~/.m2:/root/.m2 -w /w/apps/agent-factory-app maven:3.9-eclipse-temurin-21 mvn -q -o compile`.

## Prior incident (still relevant)

Browser "CORS" errors have masked: backend down, Flyway migration failure (`V6` needed `REFERENCES` on `agents`), and a missing CORS allowed-header (`X-Business-Id`). Always check Kong response + backend logs + the actual failing request's headers before touching CORS code.
