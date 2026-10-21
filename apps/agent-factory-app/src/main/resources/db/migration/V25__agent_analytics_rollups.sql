-- Tablas de resumen pre-agregado para el dashboard de analíticas. La tabla
-- cruda (agent_query_events) se sigue llenando para auditoría/debug, pero el
-- dashboard NUNCA la lee directamente: leería más filas cada mes que pasa.
-- Cada pregunta suma +1 aquí al momento (ON CONFLICT DO UPDATE), así que leer
-- el dashboard es sumar unas pocas decenas/cientos de filas de resumen, sin
-- importar cuántos millones de eventos crudos existan históricamente.
--
-- El "grain" (nivel de detalle) de cada rollup incluye TODA dimensión por la
-- que sepamos que se va a querer filtrar/agrupar después (despliegue, qué
-- pregunta puntual falla) -- agregar de más ahí sí perdería información real
-- que el negocio necesita, aunque el volumen de filas siga siendo chico
-- porque esas dimensiones son pocas (despliegues por agente), no una por
-- pregunta.

-- Preguntas/fallbacks/sugerencias por despliegue, día y hora. Pocas decenas
-- de filas por agente por día (24 horas x despliegues activos) -- de ahí
-- salen "volumen por día" y "actividad por hora" (sumando sin filtrar
-- despliegue) y, más adelante, comparativas por despliegue/canal (agrupando
-- por deployment_id en vez de sumarlo todo).
CREATE TABLE IF NOT EXISTS agent_factory.agent_analytics_hourly (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  deployment_id uuid NOT NULL,
  day date NOT NULL,
  hour smallint NOT NULL,
  total_questions bigint NOT NULL DEFAULT 0,
  fallback_count bigint NOT NULL DEFAULT 0,
  suggestion_used_count bigint NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, agent_id, deployment_id, day, hour)
);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_hourly_agent_range
  ON agent_factory.agent_analytics_hourly (tenant_id, agent_id, day);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_hourly_deployment_range
  ON agent_factory.agent_analytics_hourly (tenant_id, deployment_id, day);

-- Un visitante activo en un día = una fila (sin importar cuántas preguntas
-- hizo ese día). Únicos = COUNT DISTINCT visitor_id; recurrentes = visitante
-- con más de un día distinto dentro del rango.
CREATE TABLE IF NOT EXISTS agent_factory.agent_analytics_visitor_days (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  visitor_id varchar(80) NOT NULL,
  day date NOT NULL,
  UNIQUE (tenant_id, agent_id, visitor_id, day)
);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_visitor_days_range
  ON agent_factory.agent_analytics_visitor_days (tenant_id, agent_id, day);

-- Frecuencia de cada pregunta (normalizada) por día, y cuántas de esas veces
-- el agente respondió "no supe" (fallback_count) -- esto es lo que de verdad
-- le sirve al negocio: no solo "10% de fallback" sino "estas 5 preguntas
-- puntuales son las que más falla". Crece con la variedad real de preguntas,
-- no con el volumen bruto de mensajes.
CREATE TABLE IF NOT EXISTS agent_factory.agent_analytics_question_daily (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  day date NOT NULL,
  question_key varchar(500) NOT NULL,
  question_sample varchar(500) NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  fallback_count bigint NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, agent_id, day, question_key)
);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_question_daily_range
  ON agent_factory.agent_analytics_question_daily (tenant_id, agent_id, day);
