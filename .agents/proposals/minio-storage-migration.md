# Proposal — Document storage on MinIO (Drive kept, switchable)

**Status:** designed, NOT implemented. Paused 2026-09-04 to first ship a Drive-based release.
**Owner decision:** move new document storage to MinIO; keep the Google Drive code and make
the storage backend switchable by config (global now, per-tenant + admin UI later). Nothing
about Drive is deleted.

## Why

The Drive integration keeps producing a class of problems that MinIO removes entirely:
OAuth connect flow, service-account has no storage quota ("file is in My Drive → use a Shared
Drive" error on upload), 7-day test-token expiry, Google app verification / CASA audit,
eventually-consistent `files.list`, and a folder-provisioning state machine
(`repository_status` PENDING/ACTIVE/ERROR).

The RAG side is already ~80% ready: `DOCUMENT_SOURCE` env (`local|minio|google_drive`) +
`rag-service/app/loaders/minio_loader.py` + `MINIO_*` config already exist.

## Locked decisions (2026-09-03/04)

| # | Decision |
|---|---|
| 1 | **Bucket per tenant** (stronger isolation). Provisioning a tenant = create a bucket → keep PENDING/ACTIVE/ERROR state on `repository_bindings`. Business/KB only create key prefixes inside the bucket (instant). |
| 2 | **Rename the storage columns to storage-neutral names** now (more migration churn, cleaner). |
| 3 | **No data migration.** Migration sets `storage_provider='minio'`, nulls locators, resets `repository_status='PENDING'`; everything re-provisions on first access. Old Drive folders are left orphaned (harmless). |
| 4 | **Object key = `{uuid}__{filename}`** where uuid = `document_assets.id`. Dedup stays on the `sha256` unique-per-KB index, not the key. |
| 5 | **Hard delete, always with confirmation.** `deleteObject` → immediate `DeleteObject`. Deleting a business deletes every object under its prefix. Add a confirm dialog to single-document delete (today it is a one-click trash icon). Business delete already has the name-confirmation modal. |

## Design

### Storage abstraction (platform, new package `com.ametis.agentfactory.storage`)

```
WorkspaceLocation provisionWorkspace(tenantId, namespace)   // Drive: folders · MinIO: create bucket
String            provisionContainer(parentLocator, slug)    // business / KB -> prefix or folderId
StoredObject      putObject(locator, objectKey, mime, bytes, meta)
List<StoredObject> listObjects(locator)
void              getObject(locator, objectKey, OutputStream)
void              deleteObject(locator, objectKey)            // hard delete
void              deleteContainer(locator)                    // delete a business prefix
void              renameWorkspace(...)                        // Drive: rename · MinIO: no-op
```

- `GoogleDriveStorageProvider` = today's `GoogleDriveRepository` moved behind the interface,
  **no behaviour change**. The `drive/` package (OAuth, `DriveConnection`, controller, cipher)
  stays.
- `MinioStorageProvider` = new (AWS S3 SDK v2 or MinIO Java SDK).
- Selection: `AGENT_FACTORY_STORAGE_PROVIDER` (default `minio`). Hook left for a per-tenant
  column + admin UI later.

### Locator model

Today the DB stores Drive folder IDs. Generalise to an opaque locator string:
- Drive → folder id (`1AbC...`)
- MinIO → key prefix (`{business-slug}/{kb--8hex}/`) — the tenant namespace is the *bucket*,
  not part of the key.

### Bucket per tenant

- Name: `af-{namespace}` sanitised to S3 rules (lowercase, 3–63, alnum ends), collision-checked
  like the namespace already is. Persisted in `repository_bindings.bucket_name`.
- Layout: `{business-slug}/{kb--8hex}/{assetId}__{filename}`
- Object metadata (`x-amz-meta-*`): tenantId, businessId, knowledgeBaseId, documentAssetId,
  sha256, originalName.
- Credentials: one app credential `s3:*` on `arn:aws:s3:::af-*`; one read-only for the RAG on
  the same pattern. Per-tenant credentials = later phase if needed.
- Isolation: strong at storage level (separate bucket); credential isolation is a later step.

### Data model — migration (next free `Vnn`)

| Table | Before | After |
|---|---|---|
| `repository_bindings` | `workspace_folder_id` | `workspace_locator` |
| | `documents_folder_id` | `documents_locator` |
| | — | `+ storage_provider varchar(20) not null default 'minio'` |
| | — | `+ bucket_name varchar(63)` |
| `businesses` | `workspace_subfolder_id` | `storage_locator` |
| `knowledge_bases` | `documents_folder_id` | `documents_locator` |
| `document_assets` | `drive_file_id` | `storage_object_key` |

Plus `update ... set storage_provider='minio', <locators>=null, repository_status='PENDING'`.

Java: rename fields/getters in `RepositoryBinding`, `Business`, `KnowledgeBase`,
`DocumentAsset` and DTOs (`RepositoryResponse`, `BusinessResponse`, `KnowledgeBaseResponse`,
`DocumentResponse`). Frontend: rename the corresponding fields in `agent-factory-api.ts`.

### RAG contract renames

| Site | Before | After |
|---|---|---|
| `AmetisAiKnowledgeBaseSyncPayload` (platform) | `documentsFolderId` | `documentsLocator` |
| `KnowledgeBaseSyncPayload` (`api.py`) | `documentsFolderId` | `documentsLocator` |
| `agent_knowledge_bases.documents_folder_id` (RAG DB) | | `documents_locator` (via `ensure_*`) |
| `indexing_jobs.documents_folder_id` | | `documents_locator` |
| `CreateIndexingJobRequest` / `create_agent_indexing_jobs` | `documents_folder_id` | `documents_locator` |
| `run_ingestion(..., documents_folder_id=)` | | `documents_locator=` |
| loaders `list_documents(tenant_id, documents_folder_id=None)` | | `documents_locator=None` |

`MinioDocumentLoader.list_documents`: with `documents_locator` → use it as the key prefix
inside the tenant bucket (`bucket = af-{tenant_namespace}` via `MINIO_BUCKET_TEMPLATE`); else
fall back to `MINIO_PREFIX_TEMPLATE`. `google_drive_loader.py` stays, switchable via
`DOCUMENT_SOURCE`.

### Frontend

- Dashboard: with `provider=minio` the "Connect Google Drive" card and connection status
  disappear; reuse the `MANAGED` status already added; repository is ready instantly (bucket
  auto-provisioned on first load).
- Document delete: turn the trash icon into a small confirm dialog ("Delete `{name}`
  permanently? Cannot be undone.").
- Drive connect UI stays in code, shown only when `provider=drive`.

### Infra

- `minio` service in the platform compose (network `ametis_internal`), persistent volume,
  console. Init with `mc`: create the rw app credential and the ro RAG credential with a
  policy over `af-*`.
- VPS: persistent volume + volume backup (restic/rclone offsite) — new ops responsibility.
- Env platform: `AGENT_FACTORY_STORAGE_PROVIDER=minio`,
  `AGENT_FACTORY_MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET_PREFIX/SECURE`.
- Env RAG: `DOCUMENT_SOURCE=minio`, `MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/SECURE`,
  `MINIO_BUCKET_TEMPLATE=af-{tenant_id}` (or the namespace).

## Implementation checklist (when resumed)

1. `minio` in compose + bucket/credential init.
2. Migration (next free `Vnn`) (renames + `storage_provider` + `bucket_name` + reset to PENDING).
3. Platform: `StorageProvider` interface; move Drive behind `GoogleDriveStorageProvider` (mechanical).
4. Platform: `MinioStorageProvider`; rewire `DocumentService` + the 3 provisioning services +
   `BusinessDeletionService`; rename entity/DTO fields.
5. Platform frontend: hide Drive UI when `provider=minio`; confirm dialog on document delete.
6. RAG: contract renames + `MinioDocumentLoader` per-KB prefix + env.
7. End-to-end: register → business → KB → upload → index → query.
8. Docs: `.agents/` of both repos, `historico.md`, memory.

Effort ~2 days (global rename adds churn). Risk low; Drive path untouched functionally.

## Open items still to confirm before coding

- Exact bucket prefix (`af-` vs other) and the sanitisation of `--` in namespaces.
- Whether the RAG uses the same credential or a dedicated read-only one.
- `MINIO_BUCKET_TEMPLATE` keyed by tenant UUID vs tenant namespace slug.
