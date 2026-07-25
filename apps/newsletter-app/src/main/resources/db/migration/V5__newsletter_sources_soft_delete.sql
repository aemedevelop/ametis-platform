ALTER TABLE newsletter.sources
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_sources_tenant_deleted_created
  ON newsletter.sources(tenant_id, deleted_at, created_at DESC);
