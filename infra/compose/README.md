# Compose - Apps

## Newsletter (standalone)
Desde la raiz del repo:

```powershell
docker compose -f infra/compose/newsletter-app.compose.yml up --build
```

## Newsletter + Core (integrado)
Desde la raiz del repo:

```powershell
docker compose -f infra/docker-compose.yml -f infra/compose/newsletter-app.compose.yml up --build
```
## Newsletter Web (standalone)
Desde la raiz del repo:

```powershell
docker compose -f infra/compose/newsletter-web.compose.yml up --build
```

## Frontends (Hub + Newsletter)
Desde la raiz del repo:

```powershell
docker compose -f infra/compose/frontends.compose.yml up --build
```

## Plataforma Completa (Core + Newsletter API + Hub + Newsletter Web)
Desde la raiz del repo:

```powershell
docker compose -f infra/docker-compose.yml -f infra/platform-stack.compose.yml up -d --build
```

O con script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up-platform.ps1
```

Puertos:
- Hub: http://localhost:3000
- Newsletter: http://localhost:3100
- Newsletter API: http://localhost:8082
