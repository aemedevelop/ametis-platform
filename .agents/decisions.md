# Decisions

## Context Foundation

Development work should start from `.agents/` context files and then inspect only the relevant source files. This reduces repeated full-repo analysis while preserving correctness.

## Environment Split

- Local configuration uses `.env.local`.
- VPS/production configuration uses `.env.vps`.
- Examples live in `.env.local.example`, `.env.vps.example`, and `.env.example`.
- Real env files and secrets must not be committed.

## Public Vs Internal URLs

- Public browser/API traffic uses HTTPS domains.
- Public API domain is `https://ametis.api.aemetech.com`.
- Agent Factory frontend domain is `https://ametis.agent-factory.aemetech.com`.
- Docker-internal communication uses aliases such as `kong`, `ametis-agent-factory-app`, and `rag-service`.

## Google Drive OAuth Callback

The Drive OAuth callback in production should use the public API domain because `/api/agent-factory` is served by Kong/backend:

```env
AGENT_FACTORY_GOOGLE_OAUTH_REDIRECT_URI=https://ametis.api.aemetech.com/api/agent-factory/drive/oauth/callback
AGENT_FACTORY_GOOGLE_FRONTEND_RETURN_URI=https://ametis.agent-factory.aemetech.com
```

The same exact callback must be authorized in Google Cloud for the OAuth client.

## RAG Host Alias

Use `http://rag-service:8000` from Java services. Avoid container names with underscores in Java HTTP clients because they can trigger URI/host validation issues.

## Database Grants For Migrations

Agent Factory migrations may create foreign keys against existing tables. The runtime migration user must have `REFERENCES` on referenced tables, or the migration can fail even if normal CRUD privileges exist.

## Agent Context Profiles

Agent context profile data is stored in a separate `agent_context_profiles` table instead of adding columns to `agents`. This keeps context engineering metadata modular and avoids ownership problems when Flyway runs under an app user that can create tables but does not own older tables. The profile (persona, target audience, tone, response language) travels in the agent sync payload and is injected into the RAG prompt by `prompt_builder.build_rag_prompt`.

## Business Layer (variant A: agency / multi-client)

- Chosen model: one tenant = a consultant/agency workspace; a **Business** = an end client. Strong isolation between businesses of the same tenant.
- `businesses` lives in Agent Factory, NOT Core. Promote to Core only if per-business RBAC is ever needed.
- RAG namespace stays **per tenant** (Qdrant collection = tenant). `business_id` is a **mandatory hard filter** on retrieval and on every chunk payload — not just metadata. This was an explicit high-priority requirement.
- Knowledge bases and Drive folders partition by business; the "Negocio principal" backfill was normalized in V15 to also get its own subfolder.
- A document belongs to exactly one knowledge base (V15 dropped the `knowledge_base_documents` m2m). Document management moved out of the dashboard into the knowledge-base view (`/knowledge-bases/{id}/documents`).

## Deployment identifier and channels

- Public identifier is an opaque 32-hex token (`public_id`), no prefix, immutable except explicit regeneration. It is the isolation key of the channel; everything downstream is scoped by the deployment row's `tenant_id` / `agent.business_id`.
- MVP serves only `WEB_CHAT`, gated by `allowed_origins`. **Secure by default (2026-09-05): an empty allow-list rejects every request** — the owner must whitelist each origin. Consumption security beyond origin (api key, rate limit) is stored but not enforced yet; add it later.
- The embed widget bundle (`ametis-widget.js`) does not exist yet; the snippet is a placeholder.

## Google Drive: AEME-controlled

- Documents live in an AEME-controlled Drive, never the client's. To kill the 7-day token expiry: publish the OAuth app to production (no code change). Longer term: `service-account` auth mode + a Shared Drive so files are org-owned and quota-free.

## Document storage: moving to MinIO (Drive kept, switchable)

- **Decision (2026-09-04):** new document storage goes to MinIO (object storage, bucket per tenant). The Drive code is **kept, not deleted**, and the backend becomes switchable by config (`AGENT_FACTORY_STORAGE_PROVIDER`, global for now; per-tenant + admin UI later). A client that specifically wants Drive can still get it.
- **Why:** Drive's service account has no storage quota (upload fails with "file is in My Drive → use a Shared Drive"), plus OAuth connect friction, 7-day token expiry, app verification, eventually-consistent listing, and a folder-provisioning state machine. MinIO removes all of it. The RAG already has `DOCUMENT_SOURCE=minio` + a MinIO loader.
- **Locked sub-decisions:** bucket per tenant; rename storage columns to neutral names now; no data migration (re-create); object key `{uuid}__{filename}`; hard delete with mandatory confirmation.
- **Full spec:** `.agents/proposals/minio-storage-migration.md`.
- **Status:** implemented 2026-09-14. `com.ametis.agentfactory.storage.StorageProvider` interface; `GoogleDriveStorageProvider` (default, mechanical wrap of the existing `GoogleDriveRepository`, no behaviour change) and `MinioStorageProvider` (`io.minio:minio:8.5.12`, bucket `af-{namespace}` per tenant) both `@ConditionalOnProperty("agent-factory.storage.provider")` so only the selected one is constructed. `RepositoryProvisioningService`, `Business/KnowledgeBaseRepositoryProvisioningService`, `DocumentService`, `BusinessDeletionService`, `KnowledgeBaseService` all depend on `StorageProvider`, none on Drive directly. `GET /drive/connection` returns `MANAGED` when `provider=minio` (reuses the existing managed-storage frontend flow, no new UI needed to hide the Drive card). Document delete now asks for confirmation (was a one-click trash icon) since MinIO deletes are hard, not reversible like Drive's trash. RAG contract renamed in lockstep (`documentsFolderId`→`documentsLocator`); `MinioDocumentLoader` reads the bucket-per-tenant + `documents_locator` prefix, with the old single-bucket mode kept as fallback. Local infra: `minio` service in `infra/docker-compose.yml`. Still `AGENT_FACTORY_STORAGE_PROVIDER=drive` by default everywhere — switching an environment to `minio` is a deliberate follow-up, not automatic.
