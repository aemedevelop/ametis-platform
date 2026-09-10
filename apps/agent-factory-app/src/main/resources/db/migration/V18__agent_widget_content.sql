-- Contenido personalizable del asistente por agente (no viaja al RAG):
--  * suggested_questions: preguntas sugeridas que el widget muestra como chips
--  * assistant_texts: textos enlatados que sobreescriben los genéricos
--    (claves opcionales: fallback, greeting, thanks, farewell, help)
ALTER TABLE agent_factory.agents
  ADD COLUMN IF NOT EXISTS suggested_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assistant_texts     jsonb NOT NULL DEFAULT '{}'::jsonb;
