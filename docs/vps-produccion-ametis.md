# Despliegue VPS Produccion - Plataforma AMETIS completa

Este documento registra los pasos y ajustes necesarios para disponibilizar en VPS la plataforma AMETIS completa, integrando:

- `ametis-platform`: Hub, Core API, Keycloak, Kong, Agent Factory API y Agent Factory Web.
- `ametis-ai`: RAG Service, Qdrant, PostgreSQL compartido, worker de indexacion y Google Drive como fuente documental.
- Nginx Proxy Manager externo como terminador HTTPS.

No incluir secretos reales en este documento. Los valores sensibles deben vivir solo en los `.env` reales del VPS.

## 1. Arquitectura final

Flujo publico:

```text
Navegador
  -> HTTPS Nginx Proxy Manager
  -> HTTP al VPS AMETIS por puertos publicados
  -> Kong / Frontends / Keycloak
```

Flujo interno Docker:

```text
agent-factory-web -> https://ametis.api.aemetech.com
Kong              -> ametis-agent-factory-app:8083
agent-factory-app -> rag-service:8000
rag-service       -> ametis_postgres:5432
rag-service       -> ametis_qdrant:6333
```

Regla importante:

```text
Exterior / navegador / Nginx Proxy Manager -> dominios HTTPS
Comunicacion entre contenedores Docker     -> nombres internos Docker
```

## 2. Red Docker compartida

Los proyectos `ametis-platform` y `ametis-ai` se levantan con compose distintos, por eso deben compartir una red externa:

```bash
docker network inspect ametis_internal >/dev/null 2>&1 || docker network create ametis_internal
```

Los compose deben declarar:

```yaml
networks:
  ametis_internal:
    external: true
```

Servicios que deben estar conectados como minimo:

```text
ametis-kong
ametis-core-api
ametis-agent-factory-app
ametis-agent-factory-web
ametis-keycloak
ametis_rag_service
ametis_postgres
ametis_qdrant
```

Comprobacion:

```bash
docker network inspect ametis_internal
```

## 3. Puertos publicados en el VPS AMETIS

Platform:

```text
Kong proxy:          8440 -> 8000 interno Kong
Kong admin:          8441 -> 8001 interno Kong
Keycloak:            8081 -> 8080 interno Keycloak
Hub Web:             3010 -> 3000 interno Hub
Agent Factory Web:   3200 -> 3200 interno Agent Factory Web
Core API directo:    8090 -> 8080 interno Core API, solo diagnostico
Agent API directo:   8083 -> 8083 interno Agent Factory API, solo diagnostico
```

RAG:

```text
RAG Service:         127.0.0.1:8000 -> 8000 interno RAG
Qdrant:              6333/6334
PostgreSQL:          5432, si se expone para administracion externa
```

Para produccion, el consumo publico de API debe ir por Kong y HTTPS, no por los puertos internos de aplicaciones.

## 4. Dominios HTTPS

Propuesta final usada:

```text
ametis.hub.aemetech.com            -> Hub Web
ametis.agent-factory.aemetech.com  -> Agent Factory Web
ametis.api.aemetech.com            -> Kong proxy
ametis.auth.aemetech.com           -> Keycloak
```

En IONOS DNS, cada subdominio debe apuntar al servidor donde vive Nginx Proxy Manager.

En Nginx Proxy Manager, como esta en otro VPS, los upstreams deben apuntar a la IP publica del VPS AMETIS y puerto publicado:

```text
ametis.hub.aemetech.com            -> http://<ip-vps-ametis>:3010
ametis.agent-factory.aemetech.com  -> http://<ip-vps-ametis>:3200
ametis.api.aemetech.com            -> http://<ip-vps-ametis>:8440
ametis.auth.aemetech.com           -> http://<ip-vps-ametis>:8081
```

El upstream desde Nginx Proxy Manager debe ser `http`, porque HTTPS termina en el proxy.

## 5. Variables clave de `ametis-platform`

Archivo real en VPS:

```text
/opt/ametis-platform/.env.vps
```

Valores publicos:

```env
HUB_API_BASE_URL=https://ametis.api.aemetech.com
HUB_WEB_URL=https://ametis.hub.aemetech.com
AGENT_FACTORY_WEB_URL=https://ametis.agent-factory.aemetech.com
AGENT_FACTORY_PUBLIC_API_URL=https://ametis.api.aemetech.com
KEYCLOAK_HOSTNAME=https://ametis.auth.aemetech.com
KEYCLOAK_AUTH_URL=https://ametis.auth.aemetech.com/realms/ametis/protocol/openid-connect/auth
```

CORS:

```env
CORE_CORS_ALLOWED_ORIGIN_PATTERNS=https://ametis.hub.aemetech.com,https://ametis.agent-factory.aemetech.com
AGENT_FACTORY_CORS_ALLOWED_ORIGIN_PATTERNS=https://ametis.hub.aemetech.com,https://ametis.agent-factory.aemetech.com
```

PostgreSQL compartido:

```env
KEYCLOAK_DB_URL=jdbc:postgresql://ametis_postgres:5432/keycloak_db
KEYCLOAK_DB_USERNAME=<keycloak-db-user>
KEYCLOAK_DB_PASSWORD=<keycloak-db-password>

CORE_DB_URL=jdbc:postgresql://ametis_postgres:5432/core_db?currentSchema=core
CORE_DB_USERNAME=core_user
CORE_DB_PASSWORD=<core-db-password>

AGENT_FACTORY_DB_URL=jdbc:postgresql://ametis_postgres:5432/agent_factory_db
AGENT_FACTORY_DB_USER=agent_factory_user
AGENT_FACTORY_DB_PASSWORD=<agent-factory-db-password>
```

Agent Factory hacia RAG:

```env
AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL=http://rag-service:8000
```

Importante: no usar `ametis_rag_service` como host en Java. Aunque Docker lo resuelva, el `_` puede provocar `unsupported URI` en `RestClient`. Usar el alias con guion:

```text
rag-service
```

## 6. Variables clave de `ametis-ai`

Archivo real en VPS:

```text
/opt/ametis-ai/docker/compose/rag/.env.vps
```

PostgreSQL:

```env
POSTGRES_HOST=ametis_postgres
POSTGRES_PORT=5432
POSTGRES_DB=ametis_ai_db
POSTGRES_USER=ametis_ai_user
POSTGRES_PASSWORD=<postgres-password>
POSTGRES_SSLMODE=prefer
POSTGRES_SCHEMA=ametis_ai
```

Qdrant:

```env
QDRANT_URL=http://ametis_qdrant:6333
QDRANT_COLLECTION_PREFIX=tenant
QDRANT_COLLECTION_SUFFIX=knowledge
```

Google Drive como fuente documental:

```env
DOCUMENT_SOURCE=google_drive
GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE=/app/secrets/google-drive-service-account.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=<google-drive-root-folder-id>
```

Worker de indexacion:

```env
INDEXING_WORKER_ENABLED=true
INDEXING_WORKER_POLL_SECONDS=5
```

## 7. Montaje de secretos de Google Drive en RAG

El archivo de service account debe existir en el host:

```bash
ls -l /opt/ametis-ai/docker/compose/rag/secrets/google-drive-service-account.json
```

El compose VPS de RAG debe montar la carpeta:

```yaml
services:
  rag-service:
    volumes:
      - /opt/ametis-ai/docker/compose/rag/tenants:/app/tenants
      - /opt/ametis-ai/docker/compose/rag/secrets:/app/secrets:ro
```

Comprobar dentro del contenedor:

```bash
docker exec ametis_rag_service ls -l /app/secrets/google-drive-service-account.json
```

Si no existe dentro del contenedor, el worker fallara con:

```text
FileNotFoundError: /app/secrets/google-drive-service-account.json
```

## 8. Estructura esperada en Google Drive

El loader de RAG espera encontrar documentos bajo la carpeta raiz configurada:

```text
GOOGLE_DRIVE_ROOT_FOLDER_ID/
  <repository-namespace>/
    docs/
      documentos
```

Ejemplo:

```text
aeme-doc--6d293a5d/
  docs/
    documento.pdf
```

La service account debe tener permisos de lectura sobre la carpeta raiz y sus subcarpetas. Si no, apareceran errores de Google Drive o `403`.

## 9. Keycloak

Clientes publicos:

```text
ametis-hub-web
agent-factory-web
```

Redirect URIs:

```text
https://ametis.hub.aemetech.com/auth/callback
https://ametis.agent-factory.aemetech.com/auth/callback
```

Web origins:

```text
https://ametis.hub.aemetech.com
https://ametis.agent-factory.aemetech.com
```

Si aparece `Parametro no valido: redirect_uri`, revisar que el dominio, protocolo y ruta coincidan exactamente.

## 10. Google OAuth de Agent Factory

En Google Cloud, el OAuth Client usado por Agent Factory debe tener como redirect autorizado:

```text
https://ametis.agent-factory.aemetech.com/api/agent-factory/drive/oauth/callback
```

En `.env.vps` de platform:

```env
AGENT_FACTORY_GOOGLE_OAUTH_REDIRECT_URI=https://ametis.agent-factory.aemetech.com/api/agent-factory/drive/oauth/callback
AGENT_FACTORY_GOOGLE_FRONTEND_RETURN_URI=https://ametis.agent-factory.aemetech.com
```

Si Google devuelve:

```text
invalid_grant: Token has been expired or revoked
```

hay que reconectar Google Drive desde Agent Factory para renovar el refresh token.

## 11. Orden de arranque

Crear red:

```bash
docker network inspect ametis_internal >/dev/null 2>&1 || docker network create ametis_internal
```

Levantar primero `ametis-ai`:

```bash
cd /opt/ametis-ai
docker compose --env-file ./docker/compose/rag/.env.vps \
  -f ./docker/compose/rag/docker-compose.vps.yml \
  up -d --build
```

Levantar despues `ametis-platform`:

```bash
cd /opt/ametis-platform
docker compose --env-file .env.vps \
  -f ./infra/docker-compose.yml \
  -f ./infra/platform-stack.compose.yml \
  up -d --build
```

## 12. Comandos de reinicio por cambio

Si cambia RAG o `.env.vps`:

```bash
cd /opt/ametis-ai
docker compose --env-file ./docker/compose/rag/.env.vps \
  -f ./docker/compose/rag/docker-compose.vps.yml \
  up -d --build --force-recreate rag-service
```

Si cambia Agent Factory backend o frontend:

```bash
cd /opt/ametis-platform
docker compose --env-file .env.vps \
  -f ./infra/docker-compose.yml \
  -f ./infra/platform-stack.compose.yml \
  up -d --build --force-recreate agent-factory-app agent-factory-web
```

Si cambia Kong:

```bash
cd /opt/ametis-platform
docker compose --env-file .env.vps \
  -f ./infra/docker-compose.yml \
  -f ./infra/platform-stack.compose.yml \
  up -d --force-recreate kong
```

Si cambia Keycloak:

```bash
cd /opt/ametis-platform
docker compose --env-file .env.vps \
  -f ./infra/docker-compose.yml \
  -f ./infra/platform-stack.compose.yml \
  up -d --force-recreate keycloak
```

## 13. Validaciones basicas

Contenedores:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Kong:

```bash
curl -i http://127.0.0.1:8440/v1/health
curl -i http://127.0.0.1:8440/api/agent-factory/health
```

Keycloak:

```bash
curl -i http://127.0.0.1:8081/realms/ametis
```

RAG desde el VPS:

```bash
curl -i http://127.0.0.1:8000/docs
```

RAG desde Agent Factory:

```bash
docker exec ametis-agent-factory-app sh -c 'wget -S -O- http://rag-service:8000/docs || true'
```

Qdrant:

```bash
curl http://127.0.0.1:6333/collections
```

Variables dentro de contenedores:

```bash
docker inspect ametis-agent-factory-app --format '{{range .Config.Env}}{{println .}}{{end}}' | grep AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL
docker inspect ametis_rag_service --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E "DOCUMENT_SOURCE|GOOGLE_DRIVE|POSTGRES|QDRANT"
```

## 14. Flujo funcional de Agent Factory

El flujo correcto es:

```text
1. Conectar o reconectar Google Drive.
2. Subir documentos.
3. Crear base de conocimiento y asociar documentos.
4. Crear agente y asociar base de conocimiento.
5. Publicar agente.
6. Indexar conocimiento.
7. Esperar estado completado con chunks > 0.
8. Probar agente.
```

Publicar agente solo sincroniza la definicion con RAG:

```text
POST /agents/sync
```

Indexar conocimiento crea jobs y puntos en Qdrant:

```text
POST /agents/{agentId}/indexing-jobs
```

Probar agente consulta RAG:

```text
POST /tenants/{tenantId}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/query
```

## 15. Validacion de indexacion

Revisar jobs:

```bash
docker exec -it ametis_postgres psql -U ametis_ai_user -d ametis_ai_db
```

```sql
set search_path to ametis_ai, public;

select id, tenant_id, agent_id, knowledge_base_id, status,
       documents, chunks, error_message,
       requested_at, started_at, finished_at, attempts
from indexing_jobs
order by created_at desc
limit 10;
```

Estado sano:

```text
COMPLETED | documents > 0 | chunks > 0
```

Estado problematico:

```text
COMPLETED | documents > 0 | chunks = 0
```

Ese estado significa que el job encontro documentos, pero no dejo contenido consultable en Qdrant. La aplicacion debe tratarlo como no listo para probar.

Comprobar colecciones:

```bash
curl http://127.0.0.1:6333/collections
```

La coleccion esperada se calcula como:

```text
tenant_<repository-namespace>_knowledge
```

Ejemplo:

```text
tenant_aeme-doc--6d293a5d_knowledge
```

## 16. Errores resueltos y causa

`name resolution failed` en Kong:

- Kong no podia resolver upstreams.
- Solucion: usar nombres/aliases correctos en `ametis_internal` y `KONG_DNS_RESOLVER=127.0.0.11`.

Keycloak caido por PostgreSQL:

- `localhost:5432 refused` o URL JDBC mal formada.
- Solucion: usar `jdbc:postgresql://ametis_postgres:5432/keycloak_db`.

Login OIDC con `redirect_uri` invalido:

- Keycloak no tenia redirects HTTPS publicos.
- Solucion: registrar callbacks exactos en los clientes.

Google OAuth bloqueado:

- Redirect URI no registrado en Google Cloud.
- Solucion: registrar el callback exacto de Agent Factory.

Google Drive `invalid_grant`:

- Refresh token expirado o revocado.
- Solucion: reconectar Google Drive desde Agent Factory.

`unsupported URI http://ametis_rag_service:8000/agents/sync`:

- Java rechaza hostname con `_`.
- Solucion: usar alias `rag-service`.

`FileNotFoundError /app/secrets/google-drive-service-account.json`:

- El JSON existia en el host, pero no estaba montado en el contenedor.
- Solucion: montar `/opt/ametis-ai/docker/compose/rag/secrets:/app/secrets:ro`.

`No existe la carpeta documental del tenant: /app/tenants/.../docs`:

- RAG estaba usando `DOCUMENT_SOURCE=local`.
- Solucion: usar `DOCUMENT_SOURCE=google_drive`.

Qdrant `404 collection not found` al probar agente:

- No existia la coleccion esperada o no habia chunks.
- Solucion: revisar jobs, reindexar y exigir `chunks > 0`.

## 17. Logs utiles

Agent Factory:

```bash
docker logs ametis-agent-factory-app --tail 200
docker logs ametis-agent-factory-app --since 2m | grep -Ei "error|exception|caused by|agents/sync|rag|publish|query|test|500|503"
```

RAG:

```bash
docker logs ametis_rag_service --tail 250
docker logs ametis_rag_service --since 2m | grep -Ei "agents/sync|index|query|error|traceback|qdrant|google|drive|postgres|psycopg|500|503"
```

Qdrant:

```bash
curl http://127.0.0.1:6333/collections
```

## 18. Notas de seguridad

- No subir `.env`, `.env.vps`, `.env.secrets` ni JSON de service account.
- No exponer puertos internos de aplicaciones si no son necesarios.
- Nginx Proxy Manager debe terminar TLS y reenviar por HTTP al VPS AMETIS.
- CORS debe limitarse a los dominios publicos de frontends.
- La seguridad para clientes externos directos hacia `ametis-ai` queda pendiente; por ahora Platform gestiona y canales externos consumiran AMETIS AI cuando se defina esa capa.
