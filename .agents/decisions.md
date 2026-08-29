# Decisions

## Context Foundation

Development work should start from `.agents/` context files and then inspect only the relevant source files. This reduces repeated full-repo analysis while preserving correctness.

## Environment Split

- Local configuration uses `.env.local`.
- VPS/production configuration uses `.env.vps`.
- Examples live in `.env.local.example`, `.env.vps.example`, and `.env.example`.
- Real env files and secrets must not be committed.

## Public Vs Internal URLs

- Public browser/API traffic uses HTTPS domains.
- Public API domain is `https://ametis.api.aemetech.com`.
- Agent Factory frontend domain is `https://ametis.agent-factory.aemetech.com`.
- Docker-internal communication uses aliases such as `kong`, `ametis-agent-factory-app`, and `rag-service`.

## Google Drive OAuth Callback

The Drive OAuth callback in production should use the public API domain because `/api/agent-factory` is served by Kong/backend:

```env
AGENT_FACTORY_GOOGLE_OAUTH_REDIRECT_URI=https://ametis.api.aemetech.com/api/agent-factory/drive/oauth/callback
AGENT_FACTORY_GOOGLE_FRONTEND_RETURN_URI=https://ametis.agent-factory.aemetech.com
```

The same exact callback must be authorized in Google Cloud for the OAuth client.

## RAG Host Alias

Use `http://rag-service:8000` from Java services. Avoid container names with underscores in Java HTTP clients because they can trigger URI/host validation issues.

## Database Grants For Migrations

Agent Factory migrations may create foreign keys against existing tables. The runtime migration user must have `REFERENCES` on referenced tables, or the migration can fail even if normal CRUD privileges exist.

## Agent Context Profiles

Agent context profile data is stored in a separate `agent_context_profiles` table instead of adding columns to `agents`. This keeps context engineering metadata modular and avoids ownership problems when Flyway runs under an app user that can create tables but does not own older tables.
