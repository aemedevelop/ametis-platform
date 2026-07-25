ALTER TABLE newsletter.projects
  ADD COLUMN IF NOT EXISTS audience VARCHAR(120);

ALTER TABLE newsletter.sources
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS category VARCHAR(120);

ALTER TABLE newsletter.editorial_settings
  ADD COLUMN IF NOT EXISTS preferred_topic VARCHAR(160),
  ADD COLUMN IF NOT EXISTS article_length VARCHAR(80);

CREATE TABLE IF NOT EXISTS newsletter.drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  proposed_topic VARCHAR(240),
  generated_title VARCHAR(240),
  generated_summary TEXT,
  generated_content TEXT,
  status VARCHAR(32) NOT NULL,
  generation_source VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE newsletter.publications
  ADD COLUMN IF NOT EXISTS slug VARCHAR(260),
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS created_from_draft_id UUID;

CREATE TABLE IF NOT EXISTS newsletter.automation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  trigger_type VARCHAR(60) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL,
  external_execution_id VARCHAR(200),
  logs_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sources_tenant_project
  ON newsletter.sources(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_tenant_project
  ON newsletter.drafts(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_publications_slug
  ON newsletter.publications(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_newsletter_automation_runs_project
  ON newsletter.automation_runs(tenant_id, project_id);
