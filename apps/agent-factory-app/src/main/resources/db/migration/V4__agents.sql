CREATE TABLE agents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1000),
  instructions VARCHAR(2000),
  status VARCHAR(32) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_agents_tenant_name UNIQUE (tenant_id, name)
);

CREATE TABLE agent_knowledge_bases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id),
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_agent_knowledge_base UNIQUE (agent_id, knowledge_base_id)
);

CREATE INDEX idx_agents_tenant_updated ON agents(tenant_id, updated_at DESC);
CREATE INDEX idx_agent_knowledge_bases_agent ON agent_knowledge_bases(agent_id);
