-- Preguntas por tema y día, para el gráfico "proporción por tema" del
-- dashboard de analíticas. Mismo criterio que los rollups de V25: el
-- dashboard no lee la tabla cruda de eventos, sino este resumen que suma +1
-- por pregunta al momento.
--
-- topic_id es el id del tema de preguntas sugeridas que el RAG casó con la
-- pregunta del visitante (agent_query_events.matched_topic_id). Cadena vacía
-- = la pregunta no casó con ningún tema; se guarda '' y no NULL para que
-- entre en el UNIQUE y el upsert funcione igual que con un tema real.
CREATE TABLE IF NOT EXISTS agent_factory.agent_analytics_topic_daily (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  day date NOT NULL,
  topic_id varchar(80) NOT NULL DEFAULT '',
  count bigint NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, agent_id, day, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_topic_daily_range
  ON agent_factory.agent_analytics_topic_daily (tenant_id, agent_id, day);

-- Relleno inicial con lo ya registrado, para que el gráfico no arranque
-- vacío. Es la única vez que se lee la tabla cruda para esto.
INSERT INTO agent_factory.agent_analytics_topic_daily (id, tenant_id, agent_id, day, topic_id, count)
SELECT gen_random_uuid(), tenant_id, agent_id, created_at::date, COALESCE(btrim(matched_topic_id), ''), count(*)
FROM agent_factory.agent_query_events
GROUP BY tenant_id, agent_id, created_at::date, COALESCE(btrim(matched_topic_id), '')
ON CONFLICT (tenant_id, agent_id, day, topic_id) DO NOTHING;
