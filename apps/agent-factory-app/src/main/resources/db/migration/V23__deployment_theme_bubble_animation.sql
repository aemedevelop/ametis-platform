-- Estilo de animación de la burbuja flotante cerrada del widget: none|bounce
-- (rebote, comportamiento actual)|float (sube y baja)|ring (timbre periódico).
-- NULL = valor por defecto del widget (bounce), igual que hoy.
ALTER TABLE agent_factory.agent_deployments
  ADD COLUMN IF NOT EXISTS theme_bubble_animation varchar(20);
