# Newsletter Backend Architecture

## Ubicacion
- Producto: `apps/newsletter-app`
- Core (sin cambios estructurales): `core/apps/core-api`

## Principios
- Core es fuente de verdad para auth, usuarios, tenants, suscripciones y permisos globales.
- Newsletter-app es resource server y consume Core via HTTP.
- Sin duplicar login/registro ni modelo global de identidad.

## Modulos internos
- `accessintegration`: contexto de usuario, tenant y acceso al producto.
- `onboarding`: adapta onboarding del core para alta inicial.
- `sources`: CRUD de fuentes.
- `editorial`: settings editoriales por proyecto.
- `drafts`: borradores generados y flujo de revision.
- `publications`: historial/publicacion/scheduling.
- `automation`: trigger n8n, webhook y runs.
- `viewer`: endpoints publicos/semi-publicos de lectura.
- `observability`: health/actuator/metrics.

## Persistencia
- Base `newsletter_db`, esquema `newsletter`.
- Flyway incremental:
  - `V1__newsletter_schema.sql`
  - `V2__newsletter_product_expansion.sql`

## Integraciones externas
- Core API: autorizacion, access check y tenant onboarding.
- n8n: trigger de workflow y webhook de draft generado.
