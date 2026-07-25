# Core API (MVP)

Spring Boot service that implements MVP endpoints:

- `POST /v1/tenants`
- `GET /v1/tenants`
- `GET /v1/tenants/{tenantId}/memberships`
- `POST /v1/tenants/{tenantId}/memberships`
- `POST /v1/authorization/check`

## Local Run

```powershell
mvn spring-boot:run
```

Environment variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`

## Query layout

Complex SQL is stored in classpath resources under `src/main/resources/sql/` and loaded by repository adapters.

## Swagger

- Swagger UI: `http://localhost:8090/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8090/v3/api-docs`
- Through Kong:
  - `http://localhost:8000/swagger-ui.html`
  - `http://localhost:8000/v3/api-docs`
