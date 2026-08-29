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
