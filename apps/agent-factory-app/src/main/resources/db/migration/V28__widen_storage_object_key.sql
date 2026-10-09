-- storage_object_key heredó varchar(160) de cuando era el id de un archivo de
-- Drive. En MinIO es la ruta completa del objeto
-- ({namespace}/{negocio}/{base}/{assetId}__{nombre}), que con nombres de
-- archivo largos supera los 160 caracteres: el objeto se subía pero el UPDATE
-- fallaba ("value too long") y la subida respondía con error. 1024 es el
-- máximo de una clave de objeto S3/MinIO.

ALTER TABLE agent_factory.document_assets
  ALTER COLUMN storage_object_key TYPE varchar(1024);
