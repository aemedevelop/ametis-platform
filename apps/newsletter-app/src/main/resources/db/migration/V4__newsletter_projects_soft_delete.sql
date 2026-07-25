ALTER TABLE newsletter.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_projects_tenant_deleted_created
  ON newsletter.projects(tenant_id, deleted_at, created_at DESC);
