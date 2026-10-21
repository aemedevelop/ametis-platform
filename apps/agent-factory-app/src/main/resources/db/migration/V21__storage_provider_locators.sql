-- Fase 1 de la migración a almacenamiento abstraído (Drive hoy, MinIO próximamente).
-- Solo renombra a nombres neutrales y añade lo que falta; NO cambia datos ni
-- comportamiento. La columna `provider` ya existía (antes fija a "GOOGLE_DRIVE",
-- meramente informativa) y se reutiliza como selector de proveedor de
-- almacenamiento en la fase 2, en vez de crear una columna nueva duplicada.

ALTER TABLE agent_factory.repository_bindings
  RENAME COLUMN workspace_folder_id TO workspace_locator;
ALTER TABLE agent_factory.repository_bindings
  RENAME COLUMN documents_folder_id TO documents_locator;
ALTER TABLE agent_factory.repository_bindings
  ADD COLUMN IF NOT EXISTS bucket_name varchar(63);
UPDATE agent_factory.repository_bindings SET provider = 'drive' WHERE provider = 'GOOGLE_DRIVE';

ALTER TABLE agent_factory.businesses
  RENAME COLUMN workspace_subfolder_id TO storage_locator;

ALTER TABLE agent_factory.knowledge_bases
  RENAME COLUMN documents_folder_id TO documents_locator;

ALTER TABLE agent_factory.document_assets
  RENAME COLUMN drive_file_id TO storage_object_key;
