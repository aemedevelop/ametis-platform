-- Registro de auditoría de negocios eliminados. Sobrevive al borrado físico:
-- deja constancia de que el negocio existió y fue eliminado, sin conservar sus datos.
CREATE TABLE business_deletion_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  business_name VARCHAR(120) NOT NULL,
  business_slug VARCHAR(80) NOT NULL,
  agents_deleted INTEGER NOT NULL DEFAULT 0,
  knowledge_bases_deleted INTEGER NOT NULL DEFAULT 0,
  documents_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_business_deletion_log_tenant ON business_deletion_log (tenant_id, deleted_at DESC);
