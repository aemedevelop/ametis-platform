-- Preguntas sugeridas agrupadas por tema. Cada tema: { id, label, questions[] }.
-- El fondo "General" sigue en agents.suggested_questions.
ALTER TABLE agent_factory.agents
  ADD COLUMN IF NOT EXISTS question_topics jsonb NOT NULL DEFAULT '[]'::jsonb;
