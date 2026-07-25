Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Stopping AMETIS platform stack..."
docker compose `
  -f ./infra/docker-compose.yml `
  -f ./infra/platform-stack.compose.yml `
  down
