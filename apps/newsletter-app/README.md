# Newsletter App (Java)

Producto backend Spring Boot para AMETIS. Funciona standalone o integrado con Core.

## Endpoints principales
- `GET /api/newsletter/health`
- `GET /api/newsletter/me/context`
- `GET /api/newsletter/me/access`
- `POST /api/newsletter/onboarding/start`
- `GET /api/newsletter/onboarding/status`
- `GET|POST /api/newsletter/projects`
- `GET|POST /api/newsletter/projects/{id}/sources`
- `GET|PUT /api/newsletter/projects/{id}/editorial-settings`
- `GET /api/newsletter/projects/{id}/drafts`
- `POST /api/newsletter/projects/{id}/generate`
- `POST /api/newsletter/webhooks/n8n/draft-generated`
- `GET /api/newsletter/viewer/projects/{projectId}/publications`

## Integracion con Core
- Reutiliza JWT del Core (`oauth2 resource server`).
- Reutiliza Core para:
  - autorizacion (`/v1/authorization/check`)
  - acceso a producto (`/v1/tenants/{tenantId}/products/{productCode}/access/me`)
  - onboarding base (`/v1/tenants`)
- No implementa login ni usuarios/tenants paralelos.

## Variables de entorno
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`
- `NEWSLETTER_CORE_BASE_URL`
- `NEWSLETTER_CORE_AUTH_PATH`
- `NEWSLETTER_CORE_PRODUCT_ACCESS_PATH_TEMPLATE`
- `NEWSLETTER_CORE_TENANTS_PATH`
- `NEWSLETTER_PRODUCT_CODE`
- `NEWSLETTER_N8N_BASE_URL`
- `NEWSLETTER_N8N_GENERATE_PATH`

## Compatibilidad
- Se mantienen rutas legacy `/v1/*` para endpoints existentes del producto.
