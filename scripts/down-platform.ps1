Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Stopping AMETIS platform stack..."
docker compose `
  --env-file .env.local `
  -f ./infra/docker-compose.yml `
  -f ./infra/platform-stack.compose.yml `
  down
