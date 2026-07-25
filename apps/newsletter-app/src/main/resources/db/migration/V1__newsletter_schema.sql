CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS newsletter;

CREATE TABLE IF NOT EXISTS newsletter.sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(32) NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  language VARCHAR(20) NOT NULL,
  tone VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter.editorial_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  tone VARCHAR(80) NOT NULL,
  writing_style VARCHAR(120) NOT NULL,
  audience VARCHAR(120) NOT NULL,
  include_summary BOOLEAN NOT NULL DEFAULT TRUE,
  include_cta BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  structure JSONB NOT NULL,
  style_config JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter.publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL,
  title VARCHAR(240) NOT NULL,
  content TEXT NULL,
  status VARCHAR(32) NOT NULL,
  scheduled_at TIMESTAMPTZ NULL,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter.publication_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  publication_id UUID NOT NULL,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(240) NOT NULL,
  content TEXT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sources_tenant ON newsletter.sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_projects_tenant ON newsletter.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_templates_project ON newsletter.templates(project_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_publications_project ON newsletter.publications(project_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_publication_items_pub ON newsletter.publication_items(publication_id);