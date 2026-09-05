-- Cada base de conocimiento tiene su propia carpeta de Drive:
--   {tenant-workspace}/{negocio-slug}/{base-slug}/
-- Un documento pertenece a UNA base.

ALTER TABLE knowledge_bases
  ADD COLUMN IF NOT EXISTS documents_folder_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS repository_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS repository_error VARCHAR(1000);

ALTER TABLE document_assets ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

-- Documento -> su base (a través del vínculo m2m que se elimina después).
UPDATE document_assets da
SET knowledge_base_id = (
  SELECT kbd.knowledge_base_id FROM knowledge_base_documents kbd
  WHERE kbd.document_asset_id = da.id
  ORDER BY kbd.created_at
  LIMIT 1
)
WHERE da.knowledge_base_id IS NULL;

-- Documentos sueltos (sin base): se descartan, ya no tienen sitio en el modelo.
DELETE FROM document_assets WHERE knowledge_base_id IS NULL;

ALTER TABLE document_assets ALTER COLUMN knowledge_base_id SET NOT NULL;
ALTER TABLE document_assets ADD CONSTRAINT document_assets_kb_fkey
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id);
ALTER TABLE document_assets DROP CONSTRAINT IF EXISTS uq_document_tenant_hash;
ALTER TABLE document_assets ADD CONSTRAINT uq_document_kb_hash UNIQUE (knowledge_base_id, sha256);
CREATE INDEX IF NOT EXISTS idx_document_assets_kb ON document_assets (knowledge_base_id);

DROP TABLE IF EXISTS knowledge_base_documents;

-- Normaliza el negocio por defecto: que se re-provisione con su propia subcarpeta
-- {tenant-workspace}/{negocio-slug}/ en vez de reutilizar la carpeta del tenant.
UPDATE businesses
SET workspace_subfolder_id = NULL,
    documents_folder_id = NULL,
    repository_status = 'PENDING'
WHERE slug = 'negocio-principal';
