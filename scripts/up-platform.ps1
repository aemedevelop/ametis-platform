Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Starting AMETIS platform stack (core + newsletter backend + frontends)..."
docker compose `
  -f ./infra/docker-compose.yml `
  -f ./infra/platform-stack.compose.yml `
  up -d --build

Write-Host ""
Write-Host "Services available:"
Write-Host " - Hub web:        http://localhost:3000"
Write-Host " - Newsletter web: http://localhost:3100"
Write-Host " - Newsletter API: http://localhost:8082"
Write-Host " - Core via Kong:  http://localhost:8000"
