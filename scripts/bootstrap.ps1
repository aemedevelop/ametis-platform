Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Starting Core blueprint infrastructure..."
docker compose -f ./infra/docker-compose.yml up -d

Write-Host ""
Write-Host "Services starting:"
Write-Host " - Kong proxy:  http://localhost:8000"
Write-Host " - Kong admin:  http://localhost:8001"
Write-Host " - Keycloak:    http://localhost:8081 (admin/admin)"
Write-Host " - PostgreSQL:  localhost:5432 (postgres/postgres)"
Write-Host " - Kafka:       localhost:9092"
Write-Host ""
Write-Host "Smoke test (Kong -> core-api placeholder):"
Write-Host "Invoke-WebRequest http://localhost:8000/v1 -UseBasicParsing"
