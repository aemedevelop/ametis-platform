CREATE TABLE IF NOT EXISTS newsletter.generation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  title_hint VARCHAR(240),
  topic_hint VARCHAR(240),
  role_profile VARCHAR(80) NOT NULL,
  writing_style VARCHAR(80) NOT NULL,
  audience VARCHAR(120) NOT NULL,
  language VARCHAR(20) NOT NULL,
  content_length VARCHAR(40) NOT NULL,
  structure_type VARCHAR(80) NOT NULL,
  call_to_action VARCHAR(240),
  creativity_level VARCHAR(40) NOT NULL,
  use_references BOOLEAN NOT NULL DEFAULT FALSE,
  include_summary BOOLEAN NOT NULL DEFAULT TRUE,
  include_conclusions BOOLEAN NOT NULL DEFAULT TRUE,
  include_tags BOOLEAN NOT NULL DEFAULT FALSE,
  max_sources INTEGER,
  status VARCHAR(32) NOT NULL,
  created_by UUID,
  external_execution_id VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter.generation_request_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  generation_request_id UUID NOT NULL,
  source_id UUID NOT NULL,
  priority_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE newsletter.drafts
  ADD COLUMN IF NOT EXISTS generation_request_id UUID;

CREATE INDEX IF NOT EXISTS idx_newsletter_generation_requests_tenant_project
  ON newsletter.generation_requests(tenant_id, project_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_generation_requests_status
  ON newsletter.generation_requests(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_newsletter_generation_requests_external
  ON newsletter.generation_requests(tenant_id, external_execution_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_generation_request_sources_request
  ON newsletter.generation_request_sources(tenant_id, generation_request_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_generation_request
  ON newsletter.drafts(tenant_id, generation_request_id);
