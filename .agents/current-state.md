# Current State

Last updated: 2026-08-28

## Active Branch

- Current local branch during setup: `develop`.

## Current Agent Management Increment

- Agent Factory now stores a context profile per agent in `agent_context_profiles`.
- The profile includes persona, target audience, tone, and response language.
- The profile is stored separately from `agents` to avoid `ALTER TABLE agents` ownership issues during VPS Flyway migrations.
- Agent responses and AMETIS AI sync payloads include the profile fields.
- The Agents inventory behaves as a single-open accordion: newly created, edited, published, indexed, or tested agents open automatically; the rest stay collapsed until the user expands one.

## Recent Production Incident: Drive Reconnect Reported As CORS

Symptom:

```text
Cross-Origin Request Blocked ... CORS request did not succeed. Status code: null.
```

Actual path found during diagnosis:

1. Browser called `https://ametis.api.aemetech.com/api/agent-factory/drive/connection/authorize`.
2. Kong initially returned `503` with `name resolution failed`.
3. `ametis-agent-factory-app` was not running.
4. Backend was failing during Flyway migration `V6__agent_deployments.sql`.
5. PostgreSQL error was `permission denied for table agents`.
6. Root cause: app/migration user lacked `REFERENCES` privilege on `agent_factory.agents`.
7. After granting privileges as table owner, migration V6 applied and backend started.

Useful lesson:

- Browser CORS errors can mask upstream/proxy/backend failures. Always inspect Kong response and backend container status before changing CORS code.

## Pending Local Working Tree Notes

At the time this context foundation was added, there were existing uncommitted edits from the Drive/VPS investigation:

- `.env.example`
- `.env.vps.example`
- `docs/vps-produccion-ametis.md`

Those edits align the production Drive OAuth callback with the public API domain.

## Known Operational Expectations

- `curl -i http://127.0.0.1:8083/actuator/health` should return `200` when Agent Factory backend is healthy.
- `curl -i http://127.0.0.1:8083/api/agent-factory/drive/connection` should return `401` without a token.
- `curl -i -X OPTIONS http://127.0.0.1:8440/api/agent-factory/drive/connection/authorize ...` should return `200` with CORS headers for `https://ametis.agent-factory.aemetech.com`.
