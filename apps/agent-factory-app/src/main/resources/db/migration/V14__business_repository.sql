-- Carpeta de documentos propia por negocio (aislamiento de clientes finales).
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS workspace_subfolder_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS documents_folder_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS repository_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS repository_error VARCHAR(1000);

-- El negocio por defecto reutiliza las carpetas ya provisionadas del tenant.
UPDATE businesses b
SET workspace_subfolder_id = rb.workspace_folder_id,
    documents_folder_id = rb.documents_folder_id,
    repository_status = 'ACTIVE'
FROM repository_bindings rb
WHERE rb.tenant_id = b.tenant_id
  AND b.slug = 'negocio-principal'
  AND rb.status = 'ACTIVE'
  AND rb.documents_folder_id IS NOT NULL;

-- document_assets pertenece a un negocio.
ALTER TABLE document_assets ADD COLUMN IF NOT EXISTS business_id UUID;

UPDATE document_assets da
SET business_id = (
  SELECT b.id FROM businesses b
  WHERE b.tenant_id = da.tenant_id
  ORDER BY (b.slug = 'negocio-principal') DESC, b.created_at
  LIMIT 1
)
WHERE da.business_id IS NULL;

ALTER TABLE document_assets ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE document_assets ADD CONSTRAINT document_assets_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id);
CREATE INDEX IF NOT EXISTS idx_document_assets_business_created ON document_assets (business_id, created_at DESC);
