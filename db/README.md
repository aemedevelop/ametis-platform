# Configuracion de Base de Datos (Core)

Este directorio contiene la configuracion de base de datos del Core de la plataforma.

## Archivos principales

- `postgres/01-init-databases.sql`: inicializa bases (`keycloak_db`, `core_db`) y rol tecnico (`core_user`) cuando el volumen de Postgres es nuevo.
- `migrations/V1__core_schema.sql`: crea el esquema base del Core en el schema `core`.
- `migrations/V2__rbac_and_subscription_seed.sql`: carga catalogos iniciales de roles, permisos y planes.
- `apply-db-config.ps1`: script idempotente para aplicar toda la configuracion de BD de una sola vez (incluye creacion de schema `core`, permisos y `search_path`).

## Descripcion de tablas

- `users`: usuarios internos sincronizados con el IdP (subject externo, email, estado).
- `tenants`: organizaciones/empresas de la plataforma en modo multi-tenant.
- `roles`: roles organizativos del sistema (OWNER, ADMIN, MEMBER, VIEWER).
- `permissions`: permisos atomicos por vertical, recurso y accion (`vertical.recurso.accion`).
- `role_permissions`: relacion N:M entre roles y permisos.
- `user_tenants`: membresia de usuarios por tenant con rol y estado; permite multi-tenant por usuario.
- `plans`: catalogo de planes SaaS (FREE, PRO, BUSINESS, ENTERPRISE).
- `subscriptions`: plan activo por tenant y estado de suscripcion.
- `plan_features`: funcionalidades habilitadas por plan para feature gating.
- `tenant_configurations`: configuraciones por tenant (JSON) para modulos y fuentes.
- `outbox_events`: eventos pendientes/publicados del patron transactional outbox.
- `audit_logs`: bitacora de acciones criticas para trazabilidad y cumplimiento.
- `schema_migrations`: historial de migraciones aplicadas por el script de bootstrap.

## Uso rapido

1. Levantar postgres:

```powershell
docker compose -f .\infra\docker-compose.yml up -d postgres
```

2. Aplicar configuracion completa:

```powershell
.\db\apply-db-config.ps1
```
