param(
  [string]$ContainerName = "ametis-postgres",
  [string]$SuperUser = "postgres",
  [string]$CoreDb = "core_db",
  [string]$AgentFactoryDb = "agent_factory_db",
  [string]$MigrationsPath = "$PSScriptRoot/migrations"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-InPostgres {
  param(
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $Sql | docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $SuperUser -d $Database
}

Write-Host "Checking postgres container '$ContainerName'..."
$running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $running) {
  throw "Container '$ContainerName' is not running. Start it first: docker compose -f ./infra/docker-compose.yml up -d postgres"
}

Write-Host "Ensuring role and databases exist..."
$bootstrapSql = @'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'core_user') THEN
    CREATE ROLE core_user LOGIN PASSWORD 'core_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agent_factory_user') THEN
    CREATE ROLE agent_factory_user LOGIN PASSWORD 'agent_factory_pass';
  END IF;
END
$$;

SELECT 'CREATE DATABASE keycloak_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak_db')\gexec

SELECT 'CREATE DATABASE core_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'core_db')\gexec

SELECT 'CREATE DATABASE agent_factory_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agent_factory_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE core_db TO core_user;
GRANT ALL PRIVILEGES ON DATABASE agent_factory_db TO agent_factory_user;

\connect core_db
CREATE SCHEMA IF NOT EXISTS core AUTHORIZATION core_user;
GRANT USAGE, CREATE ON SCHEMA core TO core_user;
ALTER ROLE core_user IN DATABASE core_db SET search_path TO core,public;

ALTER DEFAULT PRIVILEGES IN SCHEMA core
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO core_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA core
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO core_user;

DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'users',
    'tenants',
    'roles',
    'permissions',
    'role_permissions',
    'user_tenants',
    'plans',
    'subscriptions',
    'plan_features',
    'tenant_configurations',
    'outbox_events',
    'audit_logs',
    'products',
    'product_branding',
    'plan_products',
    'user_product_access',
    'schema_migrations'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'core' AND table_name = v_table_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA core', v_table_name);
    END IF;
  END LOOP;
END
$$;
'@
Invoke-InPostgres -Database "postgres" -Sql $bootstrapSql

$agentFactorySql = @'
CREATE SCHEMA IF NOT EXISTS agent_factory AUTHORIZATION agent_factory_user;
GRANT USAGE, CREATE ON SCHEMA agent_factory TO agent_factory_user;
ALTER ROLE agent_factory_user IN DATABASE agent_factory_db SET search_path TO agent_factory,public;

ALTER DEFAULT PRIVILEGES IN SCHEMA agent_factory
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_factory_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA agent_factory
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO agent_factory_user;
'@
Invoke-InPostgres -Database $AgentFactoryDb -Sql $agentFactorySql

Write-Host "Ensuring migration registry exists in '$CoreDb'..."
$migrationRegistrySql = @'
SET search_path TO core,public;
CREATE TABLE IF NOT EXISTS core.schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  description TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
'@
Invoke-InPostgres -Database $CoreDb -Sql $migrationRegistrySql

if (-not (Test-Path $MigrationsPath)) {
  throw "Migrations path not found: $MigrationsPath"
}

$migrations = Get-ChildItem -Path $MigrationsPath -Filter "V*.sql" | Sort-Object Name
if (-not $migrations) {
  throw "No migration files found in: $MigrationsPath"
}

foreach ($migration in $migrations) {
  $versionMatch = [regex]::Match($migration.BaseName, "^V([^_]+)__")
  if (-not $versionMatch.Success) {
    Write-Host "Skipping file with unsupported name format: $($migration.Name)"
    continue
  }

  $version = $versionMatch.Groups[1].Value
  $checkSql = "SELECT EXISTS (SELECT 1 FROM core.schema_migrations WHERE version = '$version');"
  $alreadyApplied = ($checkSql | docker exec -i $ContainerName psql -t -A -U $SuperUser -d $CoreDb).Trim()

  if ($alreadyApplied -eq "t") {
    Write-Host "Skipping $($migration.Name) (already applied)."
    continue
  }

  Write-Host "Applying $($migration.Name)..."
  $migrationSql = "SET search_path TO core,public;`n" + (Get-Content -Raw $migration.FullName)
  $migrationSql | docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $SuperUser -d $CoreDb

  $escapedDescription = $migration.Name.Replace("'", "''")
  $insertSql = "INSERT INTO core.schema_migrations(version, description) VALUES ('$version', '$escapedDescription');"
  Invoke-InPostgres -Database $CoreDb -Sql $insertSql
}

Write-Host ""
Write-Host "Database configuration completed."
Write-Host "Applied migrations:"
$listSql = "SELECT version, description, installed_at FROM core.schema_migrations ORDER BY installed_at;"
Invoke-InPostgres -Database $CoreDb -Sql $listSql
