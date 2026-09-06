-- Personalización de apariencia del chat web por despliegue.
-- La configura AEME en la pantalla de apariencia del despliegue; el widget la
-- lee del endpoint público GET /{publicId}. Solo aplica al canal WEB_CHAT.
-- El avatar se añadirá cuando exista MinIO (guardará una referencia de objeto).

ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS theme_primary_color varchar(9);
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS theme_font varchar(40);
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS theme_position varchar(20);
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS theme_title varchar(80);
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS theme_subtitle varchar(160);
