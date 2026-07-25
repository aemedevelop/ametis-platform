# Core Modules

Core is designed as a modular monolith first. Each module owns its domain and data access boundary.

## Modules

- `identity-adapter`: Keycloak integration, token introspection, identity sync hooks.
- `tenant-management`: tenant lifecycle and tenant membership.
- `access-control`: roles, permissions, policy checks.
- `subscription`: plans, entitlements, tenant limits.
- `configuration`: tenant-level settings and source configuration.
- `event-bus`: outbox publishing and event contracts.
- `core-api`: single entrypoint exposing Core capabilities.

## Extraction Strategy

When load or team size requires, modules can be extracted into independent services without changing API and event contracts.
