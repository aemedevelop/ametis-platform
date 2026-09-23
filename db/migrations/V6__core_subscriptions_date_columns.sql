SET search_path TO core,public;

-- Igual que V5: estas columnas ya existian en produccion (agregadas a mano,
-- nunca documentadas como migracion) pero faltaban en el resto de entornos.
-- SubscriptionEntity solo mapea start_date/end_date/is_active -- starts_at/
-- ends_at quedan como columnas viejas sin usar, se dejan intactas por si
-- algun dato historico las referencia.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date timestamp without time zone;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS end_date timestamp without time zone;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_active boolean;
