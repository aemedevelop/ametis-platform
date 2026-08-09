CREATE SCHEMA IF NOT EXISTS agent_factory;
SET search_path TO agent_factory,public;

CREATE TABLE repository_bindings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  repository_namespace VARCHAR(80) NOT NULL UNIQUE,
  provider VARCHAR(32) NOT NULL,
  workspace_folder_id VARCHAR(160),
  documents_folder_id VARCHAR(160),
  status VARCHAR(32) NOT NULL,
  last_error VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE document_assets (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  repository_binding_id UUID NOT NULL REFERENCES repository_bindings(id),
  drive_file_id VARCHAR(160) UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(160),
  size_bytes BIGINT NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_document_tenant_hash UNIQUE (tenant_id, sha256)
);

CREATE INDEX idx_document_assets_tenant_created ON document_assets(tenant_id, created_at DESC);
