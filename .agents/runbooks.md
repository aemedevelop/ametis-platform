# Runbooks

## Local Agent Factory

```powershell
docker network create ametis_internal
docker compose --env-file .env.local -f ./infra/docker-compose.yml -f ./infra/platform-stack.compose.yml up -d --build agent-factory-app agent-factory-web kong
```

Restart only Agent Factory after local backend/frontend changes from Windows PowerShell:

```powershell
cd C:\Users\jarce\DATOS\AEME\DEV\ametis-platform
docker compose --env-file .env.local `
  -f ./infra/docker-compose.yml `
  -f ./infra/platform-stack.compose.yml `
  up -d --build --force-recreate --no-deps agent-factory-app agent-factory-web
```

Restart only Kong after local route/config changes from Windows PowerShell:

```powershell
cd C:\Users\jarce\DATOS\AEME\DEV\ametis-platform
docker compose --env-file .env.local `
  -f ./infra/docker-compose.yml `
  -f ./infra/platform-stack.compose.yml `
  up -d --force-recreate --no-deps kong
```

Restart only Core API after local backend changes from Windows PowerShell:

```powershell
cd C:\Users\jarce\DATOS\AEME\DEV\ametis-platform
docker compose --env-file .env.local `
  -f ./infra/docker-compose.yml `
  up -d --build --force-recreate --no-deps core-api
```

When a service already belongs to the running platform stack, use `--no-deps` to avoid recreating dependencies such as Keycloak or Core API. Without `--no-deps`, Compose follows `depends_on`:

- `core-api` depends on `keycloak`.
- `kong` depends on `core-api`.
- `agent-factory-app` depends on `keycloak` in `platform-stack.compose.yml`.

For a truly standalone Agent Factory backend run, use its module compose file instead of `platform-stack.compose.yml`:

```powershell
cd C:\Users\jarce\DATOS\AEME\DEV\ametis-platform
docker compose --env-file .env.local `
  -f ./infra/compose/agent-factory-app.compose.yml `
  up -d --build --force-recreate agent-factory-app
```

Useful checks:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl.exe -i http://localhost:8440/api/agent-factory/drive/connection
curl.exe -i http://localhost:8440/v1/health
docker logs ametis-agent-factory-app --tail 160
docker logs ametis-kong --tail 120
```

## Core DB bootstrap — required once per brand-new Postgres

`core-api` has no embedded Flyway (`ddl-auto: none`, unlike `agent-factory-app`
which migrates itself automatically). The `core` schema (`users`, `tenants`,
`roles`, `plans`, etc.) only exists after manually running `db/apply-db-config.ps1`
against that Postgres — a one-time bootstrap per environment, not per deploy.
Skipping it produces `relation "core.users" does not exist` the first time
someone tries to log in / onboard.

Run once, right after a fresh Postgres is created for any new environment
(local, pre, a future prod-on-another-host):

```powershell
.\db\apply-db-config.ps1 -ContainerName ametis-pre-postgres
```

(swap `-ContainerName` for whichever Postgres container the new environment
uses; defaults to `ametis-postgres`). Needs `pwsh`/PowerShell with Docker CLI
access to that container — if run from Windows against a remote VPS
container, needs a Docker context or SSH session with Docker available.

## VPS Platform Start

Run from `/opt/ametis-platform`:

```bash
docker compose --env-file .env.vps \
  -f ./infra/docker-compose.yml \
  -f ./infra/platform-stack.compose.yml \
  up -d --build
```

Useful checks:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl -i http://127.0.0.1:8440/v1/health
curl -i http://127.0.0.1:8440/api/agent-factory/drive/connection
docker logs ametis-kong --tail 120
docker logs ametis-agent-factory-app --tail 160
```

Expected unauthenticated response for protected endpoints is usually `401`, not `502` or `503`.

## Drive CORS / OAuth Diagnosis

Browser error `CORS request did not succeed` with status `null` often means the browser could not complete the network request. Check lower layers first.

From VPS:

```bash
curl -i -X OPTIONS http://127.0.0.1:8440/api/agent-factory/drive/connection/authorize \
  -H "Origin: https://ametis.agent-factory.aemetech.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,x-tenant-id,content-type"
```

Expected result includes:

```text
HTTP/1.1 200
Access-Control-Allow-Origin: https://ametis.agent-factory.aemetech.com
Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: authorization, x-tenant-id, content-type
```

If Kong returns `name resolution failed`, check whether `ametis-agent-factory-app` is running and connected to `ametis_internal`.

If Kong returns `502`, test the backend directly:

```bash
curl -i http://127.0.0.1:8083/actuator/health
curl -i http://127.0.0.1:8083/api/agent-factory/drive/connection
```

## Flyway Permission Diagnosis

If Agent Factory exits during migration with `permission denied for table agents`, connect as the table owner/admin and check:

```sql
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'agent_factory'
  AND tablename = 'agents';

SELECT has_table_privilege('agent_factory_user', 'agent_factory.agents', 'REFERENCES');
```

Grant as the owner, for example `ametis`:

```sql
GRANT USAGE ON SCHEMA agent_factory TO agent_factory_user;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA agent_factory TO agent_factory_user;

ALTER DEFAULT PRIVILEGES FOR ROLE ametis IN SCHEMA agent_factory
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLES TO agent_factory_user;
```

`REFERENCES` is only enough for a migration that adds a **foreign key against**
an existing table (the V6 case). A migration that does `ALTER TABLE agents ADD
COLUMN ...` / `ALTER COLUMN ... SET NOT NULL` / `ADD CONSTRAINT` **on** an
existing table needs full ownership of that table, not just a grant — Postgres
has no "ALTER TABLE" privilege separate from ownership. This bit V13
(`must be owner of table agents`, VPS deploy 2026-09-05) because `agents`,
`knowledge_bases` and `document_assets` were originally created by another
role. Fix by transferring ownership of the whole schema to the app user (safe,
covers future migrations on the same tables too):

```sql
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'agent_factory' LOOP
    EXECUTE format('ALTER TABLE agent_factory.%I OWNER TO agent_factory_user', r.tablename);
  END LOOP;
END $$;
```

Each Flyway migration runs in its own transaction on Postgres, so a mid-migration
failure rolls back cleanly — no `flyway repair` needed, just fix the grant and
restart the container to let it retry.

## Google Sign-In (Keycloak Identity Provider) — per-environment manual step

Login is SSO-only (`/auth/login` -> Keycloak Authorization Code + PKCE, no password form).
Adding "Continuar con Google" needs **no app code** — it is a Keycloak Identity Provider
(`kc_idp_hint=google` on the authorize URL, wired in `lib/oidc-pkce.ts`). But it is **not
tracked by Flyway or `realm-export.json` import** (import only runs once, when the realm
does not yet exist) — it must be configured by hand in **every** Keycloak instance
(local, VPS PRE, VPS prod all have separate DBs).

1. Google Cloud Console (project `aeme-dev`), new "Google Auth Platform" UI:
   - **Clientes** (not "Público"/test users — the OAuth app is already published to
     production) -> Create client -> Web application.
   - Redirect URIs (same client, both allowed): `http://localhost:8081/realms/ametis/broker/google/endpoint`
     and `https://ametis.auth.aemetech.com/realms/ametis/broker/google/endpoint`.
   - Copy the Client ID / Client secret.
2. Keycloak admin console, realm **ametis** -> **Identity providers -> Add provider ->
   Google** -> paste Client ID/secret -> Save. Alias must stay `google` (matches the
   frontend's `kc_idp_hint`). The advanced toggles (Trust Email, Store tokens, Account
   linking only) are optional — this realm has no required email-verification action, so
   they don't block anything; save with just the Client ID/secret if the UI hides them.
   The "Redirect URI" shown in this form is **read-only** — it's what you copy into
   Google, not something to edit.
3. Repeat step 2 on every other Keycloak instance (VPS) with the same Google
   Client ID/secret — each realm DB is separate and needs its own Identity Provider row.

## Keycloak redirect URIs — per-environment manual step

`infra/keycloak/realm-export.json` only ships `http://localhost:3200/auth/callback`
as a valid redirect URI for the `agent-factory-web` client (and the matching
`http://localhost:3200` web origin) — it is intentionally generic and never
carries real domains. The import only runs once per fresh Keycloak instance,
so **every** new instance (VPS pre, VPS prod) needs its own domain added by
hand, or login fails with Keycloak's `Invalid parameter: redirect_uri` error.

For each new instance, in the admin console (realm **ametis** -> **Clients**
-> `agent-factory-web` -> Settings):

- **Valid redirect URIs**: add `https://<its-own-domain>/auth/callback`
- **Web origins**: add `https://<its-own-domain>`

Repeat for `ametis-hub-web` too if that frontend is also exposed on the same
instance.
