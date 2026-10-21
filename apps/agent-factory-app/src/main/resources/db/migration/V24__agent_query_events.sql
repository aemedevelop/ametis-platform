-- Registro de cada pregunta que pasa por el consumo público de un despliegue
-- (widget web hoy, futuros canales mañana). Base para el módulo de
-- analíticas: funciona igual para visitantes anónimos (visitor_id generado
-- por el propio widget, guardado en su localStorage) y para consumidores
-- autenticados (user_id) -- ambos son opcionales, nunca se exige ninguno.
CREATE TABLE IF NOT EXISTS agent_factory.agent_query_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  deployment_id uuid NOT NULL,
  channel_type varchar(32) NOT NULL,
  visitor_id varchar(80),
  user_id uuid,
  question varchar(500) NOT NULL,
  response_type varchar(32),
  matched_topic_id varchar(80),
  used_suggestion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_query_events_agent_created
  ON agent_factory.agent_query_events (tenant_id, agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_query_events_deployment_created
  ON agent_factory.agent_query_events (tenant_id, deployment_id, created_at);
