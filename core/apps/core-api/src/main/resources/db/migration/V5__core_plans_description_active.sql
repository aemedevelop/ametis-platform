SET search_path TO core,public;

-- Estas columnas ya existian en produccion (agregadas a mano en algun momento,
-- nunca quedo documentado como migracion) pero faltaban en el resto de
-- entornos, causando "column pe1_0.description does not exist" en cuanto
-- PlanEntity intenta leer core.plans.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description varchar(300);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_active boolean;
