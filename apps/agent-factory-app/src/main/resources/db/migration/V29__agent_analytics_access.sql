-- Acceso de cliente a las analíticas de un agente: el consultor lo publica y
-- define usuario y contraseña; el cliente entra por una URL propia
-- (/client/analytics/{public_id}) sin cuenta en la plataforma. Una fila por
-- agente; se borra con él.

CREATE TABLE agent_factory.agent_analytics_access (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL UNIQUE REFERENCES agent_factory.agents(id) ON DELETE CASCADE,
  public_id varchar(48) NOT NULL UNIQUE,
  username varchar(120) NOT NULL,
  password_hash varchar(100) NOT NULL,
  published boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_access_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
