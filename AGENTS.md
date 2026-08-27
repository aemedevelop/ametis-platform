# AMETIS Platform Agent Context

Start here before making changes in this repository.

## Context Entry Points

- Read `.agents/project-context.md` first for the current mental model.
- Read `.agents/current-state.md` for recent incidents, known issues, and operational state.
- Read `.agents/architecture.md` before changing service boundaries, auth, tenancy, Drive, RAG, or Kong routing.
- Read `.agents/runbooks.md` before running local or VPS commands.
- Read `.agents/decisions.md` before reversing an existing technical choice.

## Working Rules

- Do not commit or expose real secrets from `.env`, `.env.local`, `.env.vps`, `.env.secrets`, or Google service-account JSON files.
- Preserve the split between local and VPS configuration: local uses `.env.local`; production uses `.env.vps`.
- Public browser/API traffic goes through HTTPS domains and Kong; container-to-container traffic uses Docker service aliases.
- Prefer existing patterns in Spring Boot apps, Next.js frontends, Kong routes, and Flyway migrations.
- When debugging production-like failures, first check container status, logs, Kong routing, and exact environment variables without printing secrets.

