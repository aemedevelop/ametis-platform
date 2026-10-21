-- La clave de agrupación de preguntas (question_key) pasa de "solo
-- minúsculas" a ignorar también tildes, signos y espacios repetidos (ver
-- QuestionNormalizer en el backend), para que "¿Dónde se encuentran?" y
-- "Dónde se encuentran?" cuenten como la misma pregunta en el Top.
--
-- Esta migración re-clava las filas ya guardadas con la misma regla y
-- fusiona las que ahora coinciden dentro del mismo día (sumando sus
-- contadores). Se hace en una sola sentencia -- borra todo y reinserta
-- agrupado -- porque la nueva clave puede chocar con el UNIQUE
-- (tenant_id, agent_id, day, question_key) si se actualizara fila a fila.
--
-- La virgulilla de la ñ se conserva a propósito ("año" != "ano"). Una
-- pregunta hecha solo de signos conserva su clave anterior.
WITH removed AS (
  DELETE FROM agent_factory.agent_analytics_question_daily
  RETURNING tenant_id, agent_id, day, question_key, question_sample, count, fallback_count
),
rekeyed AS (
  SELECT
    tenant_id, agent_id, day, question_sample, count, fallback_count,
    COALESCE(
      NULLIF(
        btrim(regexp_replace(
          regexp_replace(
            translate(lower(question_key), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu'),
            '[[:punct:]¿¡…«»“”‘’–—·]', ' ', 'g'),
          '\s+', ' ', 'g')),
        ''),
      question_key) AS new_key
  FROM removed
)
INSERT INTO agent_factory.agent_analytics_question_daily
  (id, tenant_id, agent_id, day, question_key, question_sample, count, fallback_count)
SELECT
  gen_random_uuid(), tenant_id, agent_id, day, new_key,
  max(question_sample), sum(count), sum(fallback_count)
FROM rekeyed
GROUP BY tenant_id, agent_id, day, new_key;
