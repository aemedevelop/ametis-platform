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

## VPS Pre Start (aislado de produccion, mismo VPS)

Requiere una red Docker propia (una sola vez) y un checkout de repo separado
del de produccion, p. ej. `/opt/ametis-platform-pre` y `/opt/ametis-ai-pre`
(rama `develop`, en vez de `main`):

```bash
docker network create ametis_internal_pre
```

Run from `/opt/ametis-platform-pre`:

```bash
docker compose --env-file .env.pre \
  -f ./infra/docker-compose.yml \
  -f ./infra/platform-stack.compose.yml \
  up -d --build
```

Run from `/opt/ametis-ai-pre/docker/compose/rag`:

```bash
docker compose --env-file .env.pre -f docker-compose.pre.yml up -d --build
```

Useful checks (mismo patron que produccion, puertos +1000):

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep ametis-pre
curl -i http://127.0.0.1:9440/v1/health
curl -i http://127.0.0.1:9440/api/agent-factory/drive/connection
docker logs ametis-pre-kong --tail 120
docker logs ametis-pre-agent-factory-app --tail 160
docker logs ametis_pre_rag_service --tail 160
```

`.env.pre` (ametis-platform) y `.env.pre`/`.env.secrets.pre` (ametis-ai) se
copian de sus `.example` respectivos y nunca se suben a Git (ya cubiertos por
`.env.*` en `.gitignore`). Ver [[ametis-platform-web-container]] y
[[ametis-secrets-per-tenant-llm-key]] en la memoria de Claude para el
contexto de por que este entorno existe.

### Gotcha: Kong se queda con la IP vieja tras un redeploy (502 en /v1/... o /api/agent-factory/...)

`infra/kong/kong.yml` apunta a los servicios por **nombre de contenedor**
(`http://ametis-core-api:8080`, `http://ametis-agent-factory-app:8083`) --
en `pre` esto funciona porque `ametis-pre-core-api`/`ametis-pre-agent-factory-app`
tienen un alias de red con ese mismo nombre generico, asi el mismo `kong.yml`
sirve para prod y para pre sin parametrizar nada.

El problema: Kong resuelve ese nombre a una IP y la cachea. Si `core-api` o
`agent-factory-app` se recrean (redeploy, `docker compose up -d --build`) sin
reiniciar Kong, Docker les asigna una IP nueva pero Kong sigue mandando
trafico a la IP vieja -> `502 Bad Gateway` / `connect() failed (111: Connection
refused)` en los logs de Kong, aunque el contenedor nuevo este "Up" y sano.

Diagnostico rapido:
```bash
docker logs --tail 100 ametis-pre-kong | grep "connect() failed"
docker inspect ametis-pre-core-api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
```
Si la IP del log no coincide con la del `inspect`, es esto.

Arreglo (no requiere tocar ningun archivo):
```bash
docker restart ametis-pre-kong   # o ametis-kong en produccion
```

**Regla practica**: despues de cualquier redeploy que recree `core-api` o
`agent-factory-app` (en pre o en produccion), reiniciar tambien el `kong` de
ese mismo entorno.

### Gotcha: despliegue de prueba fijo (`workspace-test`) con Origin viejo -> 403 en el widget

El despliegue interno `workspace-test` (usado por el toggle "Probar chat en
vivo" del panel de despliegues) se autoaprovisiona la primera vez que se
pide, con `allowedOrigins` = `AGENT_FACTORY_WEB_URL` en ese momento. Si se
creo ANTES de que esa variable estuviera bien puesta en el entorno (o si el
dominio cambia mas adelante), queda con el origen viejo guardado para
siempre -> el widget responde `403` (`GET /api/agent-factory/public/<id>`)
y el chat se queda pensando / muestra "No se pudo conectar con el servidor".

Diagnostico:
```bash
docker logs --tail 60 ametis-pre-agent-factory-app | grep "public/"   # busca el 403
docker exec ametis-pre-agent-factory-app env | grep AGENT_FACTORY_WEB_URL
```
Si la variable de entorno ya esta correcta pero el 403 persiste, es esto:
el despliegue ya existente tiene el origen viejo grabado en la base.

Arreglo manual (mientras el fix de codigo de abajo no este desplegado):
borrar el despliegue "Chat de prueba del workspace" desde el listado y
volver a activar el chat de prueba -- se recrea con el origen correcto.

Arreglo de fondo (ya en el codigo, agregado 2026-09-26, pendiente de
desplegar a pre/produccion): `DeploymentService.getOrCreateWorkspaceTestDeployment`
ahora resincroniza `allowedOrigins` con `AGENT_FACTORY_WEB_URL` en CADA uso,
no solo al crear -- se autocorrige solo, sin necesidad de borrar nada.

## Incidente 2026-09-26 en pre: resumen de lo que hubo que hacer

Contexto: se desplego a `develop`/pre la funcionalidad de despliegues en
borrador/publicado + chat de prueba en vivo. Dos cosas se rompieron:

1. **Login roto (502 en `/v1/auth/code/exchange`)**: Kong (`ametis-pre-kong`,
   6 dias sin reiniciarse) se quedo con la IP vieja de `ametis-pre-core-api`
   tras el redeploy. Arreglo: `docker restart ametis-pre-kong`.
2. **Widget de prueba con 403**: el despliegue fijo `workspace-test` se
   habia creado (en una prueba anterior) con `allowedOrigins` apuntando a
   `localhost` en vez del dominio real de pre. Arreglo manual: borrarlo
   desde el listado para que se recreara con el origen correcto. Arreglo de
   fondo en codigo (ver gotcha arriba): pendiente de desplegar.

Ninguno de los dos fue un bug del feature en si -- ambos son gotchas de
infraestructura que ya quedaron documentados arriba para la proxima vez.

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
