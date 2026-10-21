-- Logo/avatar del chat web. Guarda la referencia (object key) al almacenamiento
-- configurado (Drive o MinIO), nunca la imagen ni un data URI en BD.
ALTER TABLE agent_factory.agent_deployments
  ADD COLUMN IF NOT EXISTS theme_avatar_key varchar(300);
