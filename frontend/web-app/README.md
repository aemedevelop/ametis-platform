# AMETIS Web App

Frontend for Plataforma de Inteligencia Empresarial using:

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Run locally

1. Install dependencies:

```powershell
npm install
```

2. Copy env file:

```powershell
Copy-Item .env.example .env.local
```

3. Start dev server:

```powershell
npm run dev
```

App:

- `http://localhost:3000`

Backend dependency:

- Core API through Kong at `http://localhost:8000`

## Implemented screens

- `/` Main platform page with value proposition, module overview and quick access links.
- `/login` Keycloak login entry screen.
- `/dashboard` Executive dashboard with KPI cards, analytic trend chart and authorization playground.
- `/tools/core`
- `/tools/newsletter`
- `/tools/pricing`
- `/tools/market`
- `/tools/simulator`

## Design direction

- Corporate blue/cyan palette inspired by the reference style requested.
- High-contrast dashboard with glass panels and structured analytical layout.
