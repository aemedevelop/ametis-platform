param(
  [string]$SourceContainer = "ametis-postgres",
  [string]$RemoteHost = $env:VPS_PGHOST,
  [string]$RemotePort = $(if ($env:VPS_PGPORT) { $env:VPS_PGPORT } else { "5432" }),
  [string]$RemoteAdminUser = $env:VPS_PGUSER,
  [string]$RemoteAdminPassword = $env:VPS_PGPASSWORD,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$databases = @(
  @{ Name = "keycloak_db"; Owner = $RemoteAdminUser },
  @{ Name = "core_db"; Owner = "core_user"; Password = "core_pass" },
  @{ Name = "agent_factory_db"; Owner = "agent_factory_user"; Password = "agent_factory_pass" }
)

function Require-Value([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required value: $Name. Set it as a parameter or environment variable."
  }
}

function Invoke-RemotePsql([string]$Database, [string]$Sql) {
  $Sql | docker run --rm -i `
    -e "PGPASSWORD=$RemoteAdminPassword" `
    postgres:16-alpine `
    psql `
      -h $RemoteHost `
      -p $RemotePort `
      -U $RemoteAdminUser `
      -d $Database `
      -v ON_ERROR_STOP=1
}

function Test-RemoteDatabase([string]$Database) {
  $result = docker run --rm `
    -e "PGPASSWORD=$RemoteAdminPassword" `
    postgres:16-alpine `
    psql `
      -h $RemoteHost `
      -p $RemotePort `
      -U $RemoteAdminUser `
      -d postgres `
      -tAc "select 1 from pg_database where datname = '$Database'"
  return ($result -join "").Trim() -eq "1"
}

function Backup-RemoteDatabase([string]$Database, [string]$BackupDir) {
  if (-not (Test-RemoteDatabase $Database)) {
    Write-Host "Remote database does not exist yet, skipping backup: $Database"
    return
  }

  Write-Host "Backing up remote database before restore: $Database"
  docker run --rm `
    -e "PGPASSWORD=$RemoteAdminPassword" `
    -v "${BackupDir}:/backups" `
    postgres:16-alpine `
    pg_dump `
      -h $RemoteHost `
      -p $RemotePort `
      -U $RemoteAdminUser `
      -d $Database `
      -Fc `
      --no-owner `
      --no-acl `
      -f "/backups/$Database.before-restore.dump"
}

if ($Apply) {
  Require-Value "RemoteHost/VPS_PGHOST" $RemoteHost
  Require-Value "RemoteAdminUser/VPS_PGUSER" $RemoteAdminUser
  Require-Value "RemoteAdminPassword/VPS_PGPASSWORD" $RemoteAdminPassword
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir = Join-Path (Get-Location) ".tmp\db-migration-$timestamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Exporting selected databases from $SourceContainer..."
Write-Host "Newsletter is intentionally excluded."

foreach ($database in $databases) {
  $dumpPath = Join-Path $outDir "$($database.Name).dump"
  docker exec $SourceContainer pg_dump `
    -U postgres `
    -d $database.Name `
    -Fc `
    --no-owner `
    --no-acl `
    -f "/tmp/$($database.Name).dump"
  docker cp "${SourceContainer}:/tmp/$($database.Name).dump" $dumpPath
  docker exec $SourceContainer rm -f "/tmp/$($database.Name).dump" | Out-Null
  Write-Host "Created dump: $dumpPath"
}

$bootstrapSql = @"
do `$`$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'core_user') then
    create role core_user login password 'core_pass';
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'agent_factory_user') then
    create role agent_factory_user login password 'agent_factory_pass';
  end if;
end
`$`$;
"@

if ($Apply) {
  Write-Host "Creating remote roles and databases on ${RemoteHost}:$RemotePort..."
  Invoke-RemotePsql "postgres" $bootstrapSql

  $remoteBackupDir = Join-Path $outDir "remote-before-restore"
  New-Item -ItemType Directory -Force -Path $remoteBackupDir | Out-Null

  foreach ($database in $databases) {
    Backup-RemoteDatabase $database.Name $remoteBackupDir
  }

  foreach ($database in $databases) {
    $owner = if ([string]::IsNullOrWhiteSpace($database.Owner)) { $RemoteAdminUser } else { $database.Owner }
    $createDbSql = "select 'create database $($database.Name) owner $owner' where not exists (select from pg_database where datname = '$($database.Name)')\gexec"
    Invoke-RemotePsql "postgres" $createDbSql
  }

  foreach ($database in $databases) {
    $dumpPath = Join-Path $outDir "$($database.Name).dump"
    Write-Host "Restoring $($database.Name) to remote Postgres..."
    docker run --rm `
      -e "PGPASSWORD=$RemoteAdminPassword" `
      -v "${outDir}:/dumps:ro" `
      postgres:16-alpine `
      pg_restore `
        -h $RemoteHost `
        -p $RemotePort `
        -U $RemoteAdminUser `
        -d $database.Name `
        --clean `
        --if-exists `
        --no-owner `
        --no-acl `
        "/dumps/$($database.Name).dump"
  }

  Write-Host "Migration applied. Databases migrated: keycloak_db, core_db, agent_factory_db."
} else {
  Write-Host "Dry run completed. Dumps are ready in: $outDir"
  Write-Host "Run again with -Apply to create/restore on the VPS Postgres."
}
