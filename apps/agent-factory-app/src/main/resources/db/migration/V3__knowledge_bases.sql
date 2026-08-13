CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1000),
  status VARCHAR(32) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_knowledge_base_tenant_name UNIQUE (tenant_id, name)
);

CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  document_asset_id UUID NOT NULL REFERENCES document_assets(id),
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_knowledge_base_document UNIQUE (knowledge_base_id, document_asset_id)
);

CREATE INDEX idx_knowledge_bases_tenant_updated ON knowledge_bases(tenant_id, updated_at DESC);
CREATE INDEX idx_knowledge_base_documents_kb ON knowledge_base_documents(knowledge_base_id);
