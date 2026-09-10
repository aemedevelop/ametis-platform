-- Cómo muestra el widget las preguntas sugeridas:
--  * count: cuántas se enseñan cada vez (1..6)
--  * order: 'random' (subconjunto al azar) | 'fixed' (las primeras, en el orden configurado)
ALTER TABLE agent_factory.agents
  ADD COLUMN IF NOT EXISTS suggested_questions_count integer     NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS suggested_questions_order varchar(10) NOT NULL DEFAULT 'random';
